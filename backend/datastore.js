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

        // Seed Users table
        const userCheck = await docClient.send(new ScanCommand({ TableName: "Users", Limit: 1 }));
        if (!userCheck.Items || userCheck.Items.length === 0) {
            console.log("Seeding Users table...");
            const initialUsers = [
                {
                    userId: "rajesh_kumar",
                    name: "Rajesh Kumar",
                    email: "rajesh.k@routemate.com",
                    role: "driver",
                    currentLatitude: 11.0168,
                    currentLongitude: 76.9558,
                    lastUpdated: new Date().toISOString()
                },
                {
                    userId: "anand_selvan",
                    name: "Anand Selvan",
                    email: "anand.s@routemate.com",
                    role: "driver",
                    currentLatitude: 10.9754,
                    currentLongitude: 76.9612,
                    lastUpdated: new Date().toISOString()
                },
                {
                    userId: "priya_murugan",
                    name: "Priya Murugan",
                    email: "priya.m@routemate.com",
                    role: "driver",
                    currentLatitude: 10.6589,
                    currentLongitude: 77.0072,
                    lastUpdated: new Date().toISOString()
                },
                {
                    userId: "guest_passenger",
                    name: "Guest Passenger",
                    email: "passenger@routemate.com",
                    role: "passenger",
                    currentLatitude: 11.0168,
                    currentLongitude: 76.9558,
                    lastUpdated: new Date().toISOString()
                }
            ];
            for (const user of initialUsers) {
                await docClient.send(new PutCommand({ TableName: "Users", Item: user }));
            }
            console.log("Users table seeded.");
        }

        const rideCheck = await docClient.send(new ScanCommand({ TableName: "Rides", Limit: 1 }));
        if (!rideCheck.Items || rideCheck.Items.length === 0) {
            console.log("Seeding Rides table...");
            const initialRides = [
                {
                    rideId: "1",
                    driverId: "rajesh_kumar",
                    passengerId: "",
                    rideStatus: "Searching",
                    driverName: "Rajesh Kumar",
                    driverImage: "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&w=120&h=120&q=80",
                    driverRating: 4.8,
                    driverTrips: 342,
                    vehicleType: "Swift Dzire (Sedan)",
                    vehicleNumber: "TN-37-BY-1234",
                    currentLocation: "Coimbatore Junction",
                    destination: "Pollachi Bus Stand",
                    availableSeats: 3,
                    passengersOnboard: 1,
                    etaMins: 40,
                    fare: 180,
                    verified: true
                },
                {
                    rideId: "2",
                    driverId: "anand_selvan",
                    passengerId: "",
                    rideStatus: "Searching",
                    driverName: "Anand Selvan",
                    driverImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&h=120&q=80",
                    driverRating: 4.9,
                    driverTrips: 512,
                    vehicleType: "Toyota Innova (SUV)",
                    vehicleNumber: "TN-38-EF-5678",
                    currentLocation: "Gandhipuram Bus Stand",
                    destination: "Tiruppur Old Bus Stand",
                    availableSeats: 4,
                    passengersOnboard: 3,
                    etaMins: 55,
                    fare: 210,
                    verified: true
                },
                {
                    rideId: "3",
                    driverId: "priya_murugan",
                    passengerId: "",
                    rideStatus: "Searching",
                    driverName: "Priya Murugan",
                    driverImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&h=120&q=80",
                    driverRating: 4.7,
                    driverTrips: 189,
                    vehicleType: "Hyundai i20 (Hatchback)",
                    vehicleNumber: "TN-66-AA-9012",
                    currentLocation: "Pollachi Town Hall",
                    destination: "Udumalpet Bus Depot",
                    availableSeats: 2,
                    passengersOnboard: 2,
                    etaMins: 25,
                    fare: 120,
                    verified: true
                },
                {
                    rideId: "4",
                    driverId: "vikram_rathore",
                    passengerId: "",
                    rideStatus: "Searching",
                    driverName: "Vikram Rathore",
                    driverImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80",
                    driverRating: 4.6,
                    driverTrips: 98,
                    vehicleType: "Honda Amaze (Sedan)",
                    vehicleNumber: "TN-37-CZ-3456",
                    currentLocation: "Coimbatore Airport",
                    destination: "Palakkad Town Junction",
                    availableSeats: 3,
                    passengersOnboard: 1,
                    etaMins: 70,
                    fare: 250,
                    verified: false
                },
                {
                    rideId: "5",
                    driverId: "senthil_kumar",
                    passengerId: "",
                    rideStatus: "Searching",
                    driverName: "Senthil Kumar",
                    driverImage: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=120&h=120&q=80",
                    driverRating: 4.9,
                    driverTrips: 420,
                    vehicleType: "Maruti Ertiga (SUV)",
                    vehicleNumber: "TN-38-KL-7890",
                    currentLocation: "Singanallur Junction",
                    destination: "Pollachi Central Market",
                    availableSeats: 5,
                    passengersOnboard: 2,
                    etaMins: 45,
                    fare: 190,
                    verified: true
                }
            ];
            for (const ride of initialRides) {
                await docClient.send(new PutCommand({ TableName: "Rides", Item: ride }));
            }
            console.log("Database seeded with initial rides.");
        }

        const bookingCheck = await docClient.send(new ScanCommand({ TableName: "Bookings", Limit: 1 }));
        if (!bookingCheck.Items || bookingCheck.Items.length === 0) {
            console.log("Seeding Bookings table...");
            const initialBookings = [
                {
                    bookingId: "201",
                    rideId: "1",
                    passengerId: "guest_passenger",
                    bookingStatus: "Confirmed",
                    status: "Confirmed",
                    driverName: "Rajesh Kumar",
                    vehicleType: "Swift Dzire (Sedan)",
                    vehicleNumber: "TN-37-BY-1234",
                    pickup: "Coimbatore Junction",
                    destination: "Pollachi Bus Stand",
                    date: new Date().toISOString().split("T")[0],
                    passengers: 2,
                    fare: 360,
                    etaMins: 25,
                    currentLocation: "Eachanari Bypass Road"
                },
                {
                    bookingId: "202",
                    rideId: "2",
                    passengerId: "guest_passenger",
                    bookingStatus: "Completed",
                    status: "Completed",
                    driverName: "Anand Selvan",
                    vehicleType: "Toyota Innova (SUV)",
                    vehicleNumber: "TN-38-EF-5678",
                    pickup: "Gandhipuram Bus Stand",
                    destination: "Tiruppur Old Bus Stand",
                    date: "2026-06-18",
                    passengers: 1,
                    fare: 210,
                    etaMins: 0,
                    currentLocation: "Tiruppur Old Bus Stand"
                },
                {
                    bookingId: "203",
                    rideId: "3",
                    passengerId: "guest_passenger",
                    bookingStatus: "Completed",
                    status: "Completed",
                    driverName: "Priya Murugan",
                    vehicleType: "Hyundai i20 (Hatchback)",
                    vehicleNumber: "TN-66-AA-9012",
                    pickup: "Pollachi Town Hall",
                    destination: "Udumalpet Bus Depot",
                    date: "2026-06-12",
                    passengers: 2,
                    fare: 240,
                    etaMins: 0,
                    currentLocation: "Udumalpet Bus Depot"
                }
            ];
            for (const booking of initialBookings) {
                await docClient.send(new PutCommand({ TableName: "Bookings", Item: booking }));
            }
            console.log("Database seeded with initial bookings.");
        }

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
    seedDatabase
};

module.exports = datastore;
