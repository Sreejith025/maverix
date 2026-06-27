const { DynamoDBClient, DescribeTableCommand, CreateTableCommand, DeleteTableCommand } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand, PutCommand, UpdateCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({
    region: process.env.AWS_REGION || "eu-north-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});
const docClient = DynamoDBDocumentClient.from(client);

async function ensureTableExists(tableName, keyName, keyType) {
    try {
        const desc = await client.send(new DescribeTableCommand({ TableName: tableName }));
        const currentKeyName = desc.Table.KeySchema[0].AttributeName;
        if (currentKeyName !== keyName) {
            console.log(`Table "${tableName}" has key "${currentKeyName}" instead of expected "${keyName}". Re-creating table...`);
            await client.send(new DeleteTableCommand({ TableName: tableName }));
            console.log(`Table "${tableName}" deletion requested. Waiting...`);
            let deleted = false;
            while (!deleted) {
                try {
                    await client.send(new DescribeTableCommand({ TableName: tableName }));
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (err) {
                    if (err.name === "ResourceNotFoundException") {
                        deleted = true;
                        console.log(`Table "${tableName}" deleted successfully.`);
                    } else {
                        throw err;
                    }
                }
            }
            throw { name: "ResourceNotFoundException" };
        }
        console.log(`Table "${tableName}" already exists and matches expected schema.`);
    } catch (err) {
        if (err.name === "ResourceNotFoundException") {
            console.log(`Table "${tableName}" does not exist. Creating...`);
            await client.send(new CreateTableCommand({
                TableName: tableName,
                KeySchema: [
                    { AttributeName: keyName, KeyType: "HASH" }
                ],
                AttributeDefinitions: [
                    { AttributeName: keyName, AttributeType: keyType }
                ],
                BillingMode: "PAY_PER_REQUEST"
            }));
            console.log(`Table "${tableName}" creation requested. Waiting for table to become ACTIVE...`);
            let active = false;
            while (!active) {
                try {
                    const desc = await client.send(new DescribeTableCommand({ TableName: tableName }));
                    if (desc.Table.TableStatus === "ACTIVE") {
                        active = true;
                        console.log(`Table "${tableName}" is now ACTIVE.`);
                    } else {
                        console.log(`Table "${tableName}" status: ${desc.Table.TableStatus}. Retrying in 1s...`);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                } catch (descErr) {
                    console.log(`Waiting for table description: ${descErr.message}. Retrying in 1s...`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        } else {
            console.error(`Error describing/creating table "${tableName}":`, err);
            throw err;
        }
    }
}

// Seeding logic to run on DB connection
async function seedDatabase() {
    try {
        console.log("Ensuring DynamoDB tables exist...");
        await ensureTableExists("Users", "userId", "S");
        await ensureTableExists("Rides", "rideId", "S");
        await ensureTableExists("Bookings", "bookingId", "S");
        await ensureTableExists("Wallet", "userId", "S");
        await ensureTableExists("Reviews", "reviewId", "S");

        // Clear existing Rides
        const scanRides = await docClient.send(new ScanCommand({ TableName: "Rides" }));
        if (scanRides.Items && scanRides.Items.length > 0) {
            const { DeleteCommand } = require("@aws-sdk/lib-dynamodb");
            for (const r of scanRides.Items) {
                await docClient.send(new DeleteCommand({ TableName: "Rides", Key: { rideId: r.rideId } }));
            }
            console.log("Cleared existing rides.");
        }

        // Clear existing Bookings
        const scanBookings = await docClient.send(new ScanCommand({ TableName: "Bookings" }));
        if (scanBookings.Items && scanBookings.Items.length > 0) {
            const { DeleteCommand } = require("@aws-sdk/lib-dynamodb");
            for (const b of scanBookings.Items) {
                await docClient.send(new DeleteCommand({ TableName: "Bookings", Key: { bookingId: b.bookingId } }));
            }
            console.log("Cleared existing bookings.");
        }

        // Clear demo users
        const demoUsers = ["rajesh_kumar", "anand_selvan", "priya_murugan", "guest_passenger"];
        const { DeleteCommand } = require("@aws-sdk/lib-dynamodb");
        for (const userId of demoUsers) {
            await docClient.send(new DeleteCommand({ TableName: "Users", Key: { userId } }));
        }
        console.log("Cleared demo users.");

        const walletCheck = await docClient.send(new GetCommand({ TableName: "Wallet", Key: { userId: "balance" } }));
        if (!walletCheck.Item) {
            console.log("Seeding Wallet table with initial balance of 1450...");
            await docClient.send(new PutCommand({
                TableName: "Wallet",
                Item: { userId: "balance", balance: 1450 }
            }));
            console.log("Database seeded with initial wallet balance of 1450.");
        }
    } catch (err) {
        console.error("Error seeding database:", err);
    }
}

const datastore = {
    docClient,
    getRides: async () => {
        const res = await docClient.send(new ScanCommand({ TableName: "Rides" }));
        const items = res.Items || [];
        return items.map(item => ({ ...item, id: Number(item.rideId) || item.rideId })).sort((a, b) => a.id - b.id);
    },
    addRide: async (ride) => {
        // Clean up any existing older rides for this driver name to prevent duplicate entries
        try {
            const res = await docClient.send(new ScanCommand({
                TableName: "Rides",
                FilterExpression: "driverName = :d",
                ExpressionAttributeValues: { ":d": ride.driverName }
            }));
            const existing = res.Items || [];
            for (const r of existing) {
                console.log(`Cleaning up old duplicate ride ID: ${r.rideId} for driver: ${ride.driverName}`);
                await docClient.send(new DeleteCommand({
                    TableName: "Rides",
                    Key: { rideId: r.rideId }
                }));
            }
        } catch (e) {
            console.error("Error cleaning up old duplicate rides:", e);
        }

        const item = {
            ...ride,
            rideId: String(ride.id),
            driverId: ride.driverId || ride.driverName.toLowerCase().replace(/ /g, "_"),
            passengerId: ride.passengerId || "",
            rideStatus: ride.rideStatus || "Searching"
        };
        await docClient.send(new PutCommand({ TableName: "Rides", Item: item }));
        return { ...item, id: ride.id };
    },
    getBookings: async () => {
        const res = await docClient.send(new ScanCommand({ TableName: "Bookings" }));
        const items = res.Items || [];
        return items.map(item => ({ ...item, id: Number(item.bookingId) || item.bookingId })).sort((a, b) => b.id - a.id);
    },
    addBooking: async (booking) => {
        const item = {
            ...booking,
            bookingId: String(booking.id),
            rideId: String(booking.rideId || booking.id),
            passengerId: booking.passengerId || "guest_passenger",
            bookingStatus: booking.status || "Pending",
            status: booking.status || "Pending"
        };
        await docClient.send(new PutCommand({ TableName: "Bookings", Item: item }));
        return { ...item, id: booking.id };
    },
    confirmBooking: async (bookingId) => {
        const res = await docClient.send(new UpdateCommand({
            TableName: "Bookings",
            Key: { bookingId: String(bookingId) },
            UpdateExpression: "SET bookingStatus = :s, #status = :s",
            ExpressionAttributeNames: { "#status": "status" },
            ExpressionAttributeValues: { ":s": "Confirmed" },
            ReturnValues: "ALL_NEW"
        }));
        const updated = res.Attributes;
        if (updated && updated.rideId) {
            await docClient.send(new UpdateCommand({
                TableName: "Rides",
                Key: { rideId: String(updated.rideId) },
                UpdateExpression: "SET rideStatus = :s, passengerId = :p",
                ExpressionAttributeValues: {
                    ":s": "Accepted",
                    ":p": updated.passengerId || "guest_passenger"
                }
            }));
        }
        return { ...updated, id: Number(updated.bookingId) || updated.bookingId };
    },
    cancelBooking: async (bookingId) => {
        const res = await docClient.send(new UpdateCommand({
            TableName: "Bookings",
            Key: { bookingId: String(bookingId) },
            UpdateExpression: "SET bookingStatus = :s, #status = :s",
            ExpressionAttributeNames: { "#status": "status" },
            ExpressionAttributeValues: { ":s": "Cancelled" },
            ReturnValues: "ALL_NEW"
        }));
        const updated = res.Attributes;
        if (updated && updated.rideId) {
            await docClient.send(new UpdateCommand({
                TableName: "Rides",
                Key: { rideId: String(updated.rideId) },
                UpdateExpression: "SET rideStatus = :s",
                ExpressionAttributeValues: { ":s": "Cancelled" }
            }));
        }
        return { ...updated, id: Number(updated.bookingId) || updated.bookingId };
    },
    getBookingsForDriver: async (driverName) => {
        const res = await docClient.send(new ScanCommand({
            TableName: "Bookings",
            FilterExpression: "driverName = :d AND bookingStatus = :s",
            ExpressionAttributeValues: {
                ":d": driverName,
                ":s": "Pending"
            }
        }));
        const items = res.Items || [];
        return items.map(item => ({ ...item, id: Number(item.bookingId) || item.bookingId })).sort((a, b) => b.id - a.id);
    },
    getWalletBalance: async (userId = "balance") => {
        const res = await docClient.send(new GetCommand({
            TableName: "Wallet",
            Key: { userId }
        }));
        return res.Item ? res.Item.balance : 1450;
    },
    updateWalletBalance: async (amount, userId = "balance") => {
        const res = await docClient.send(new UpdateCommand({
            TableName: "Wallet",
            Key: { userId },
            UpdateExpression: "SET balance = if_not_exists(balance, :zero) + :amount",
            ExpressionAttributeValues: {
                ":amount": amount,
                ":zero": 0
            },
            ReturnValues: "ALL_NEW"
        }));
        return res.Attributes.balance;
    },
    getReviews: async () => {
        const res = await docClient.send(new ScanCommand({ TableName: "Reviews" }));
        const items = res.Items || [];
        return items.map(item => ({ ...item, id: Number(item.reviewId) || item.reviewId })).sort((a, b) => b.id - a.id);
    },
    addReview: async (review) => {
        const item = {
            ...review,
            reviewId: String(review.id),
            rideId: String(review.rideId || Date.now())
        };
        await docClient.send(new PutCommand({ TableName: "Reviews", Item: item }));
        return { ...item, id: review.id };
    },
    getUsers: async () => {
        const res = await docClient.send(new ScanCommand({ TableName: "Users" }));
        return res.Items || [];
    },
    getUnverifiedDrivers: async () => {
        const res = await docClient.send(new ScanCommand({
            TableName: "Rides",
            FilterExpression: "verified = :v",
            ExpressionAttributeValues: { ":v": false }
        }));
        const items = res.Items || [];
        return items.map(item => ({ ...item, id: Number(item.rideId) || item.rideId }));
    },
    seedDatabase
};

module.exports = datastore;
