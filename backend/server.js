require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const datastore = require("./datastore");

const app = express();

app.use(cors());
app.use(express.json());

// Initialize and seed DynamoDB database
datastore.seedDatabase()
    .then(() => {
        console.log("DynamoDB initialization and seeding completed.");
    })
    .catch(err => {
        console.error("Failed to initialize DynamoDB:", err);
    });

// API Endpoints

// Root checking endpoint
app.get("/", (req, res) => {
    res.json({
        message: "RouteMate API Service Running",
        time: new Date().toISOString()
    });
});

function getLocationCoords(name) {
    if (!name) return [11.0168, 76.9558];
    const n = name.toLowerCase();
    if (n.includes("coimbatore")) return [11.0168, 76.9558];
    if (n.includes("pollachi")) return [10.6589, 77.0072];
    if (n.includes("tiruppur")) return [11.1085, 77.3411];
    if (n.includes("palakkad")) return [10.7867, 76.6547];
    if (n.includes("udumalpet")) return [10.5855, 77.2433];
    if (n.includes("kinathukadavu")) return [10.8234, 76.9858];
    if (n.includes("eachanari")) return [10.9123, 76.9658];
    if (n.includes("singanallur")) return [10.9995, 77.0266];
    return [11.0168, 76.9558];
}

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function isLocationOnRoute(startLocation, endLocation, passengerPickup, passengerDestination) {
    const s = startLocation.toLowerCase();
    const e = endLocation.toLowerCase();
    const pPickup = passengerPickup.toLowerCase();
    const pDest = passengerDestination.toLowerCase();

    // Direct match check
    if (s.includes(pPickup) && e.includes(pDest)) {
        return true;
    }

    if (
        (s.includes("coimbatore") && e.includes("pollachi")) || 
        (s.includes("pollachi") && e.includes("coimbatore"))
    ) {
        if (pPickup.includes("kinathukadavu") || pPickup.includes("eachanari")) {
            if (pDest.includes("pollachi") || pDest.includes("coimbatore")) {
                return true;
            }
        }
    }

    const routes = [
        ["coimbatore", "podanur", "eachanari", "kinathukadavu", "achipatti", "pollachi"],
        ["coimbatore", "singanallur", "peelamedu", "hope college", "coimbatore airport", "avinashi", "tiruppur"],
        ["coimbatore", "kuniamuthur", "kgo chavadi", "walayar", "kanjikode", "palakkad"],
        ["coimbatore", "eachanari", "kinathukadavu", "pollachi", "udumalpet"]
    ];

    for (const route of routes) {
        let driverStartIndex = -1;
        let driverEndIndex = -1;
        for (let i = 0; i < route.length; i++) {
            if (s.includes(route[i])) driverStartIndex = i;
            if (e.includes(route[i])) driverEndIndex = i;
        }

        if (driverStartIndex !== -1 && driverEndIndex !== -1) {
            // Forward direction
            if (driverStartIndex < driverEndIndex) {
                let pStartIndex = -1;
                let pEndIndex = -1;
                for (let i = driverStartIndex; i <= driverEndIndex; i++) {
                    if (pPickup.includes(route[i])) pStartIndex = i;
                    if (pDest.includes(route[i])) pEndIndex = i;
                }
                if (pStartIndex !== -1 && pEndIndex !== -1 && pStartIndex < pEndIndex) {
                    return true;
                }
            }
            // Backward direction
            if (driverStartIndex > driverEndIndex) {
                let pStartIndex = -1;
                let pEndIndex = -1;
                for (let i = driverStartIndex; i >= driverEndIndex; i--) {
                    if (pPickup.includes(route[i])) pStartIndex = i;
                    if (pDest.includes(route[i])) pEndIndex = i;
                }
                if (pStartIndex !== -1 && pEndIndex !== -1 && pStartIndex > pEndIndex) {
                    return true;
                }
            }
        }
    }

    return false;
}

// GET rides
app.get("/api/rides", async (req, res) => {
    try {
        const { pickup, destination, womenOnly, passengers } = req.query;
        let rides = await datastore.getRides();
        
        // Filter by ACTIVE/Accepted status
        rides = rides.filter(r => r.rideStatus === "ACTIVE" || r.rideStatus === "Searching" || r.rideStatus === "Accepted");

        // Filter by destination if provided
        if (destination) {
            const d = destination.toLowerCase();
            rides = rides.filter(r => r.destination.toLowerCase().includes(d));
        }

        // Filter by womenOnly if true
        if (womenOnly === "true") {
            rides = rides.filter(r => r.womenOnly === true && r.verified === true);
        }

        // Filter by available seats capacity if passengers count is requested
        if (passengers) {
            const passengerCount = Number(passengers) || 1;
            rides = rides.filter(r => (r.availableSeats !== undefined ? r.availableSeats : 4) >= passengerCount);
        }

        if (pickup && destination) {
            // Filter by route match
            rides = rides.filter(ride => 
                isLocationOnRoute(ride.currentLocation, ride.destination, pickup, destination)
            );

            // Sort by nearest driver (using passenger pickup coords to driver current position)
            const passengerCoords = getLocationCoords(pickup);
            rides.sort((a, b) => {
                const aLat = a.currentLatitude || getLocationCoords(a.currentLocation)[0];
                const aLng = a.currentLongitude || getLocationCoords(a.currentLocation)[1];
                const bLat = b.currentLatitude || getLocationCoords(b.currentLocation)[0];
                const bLng = b.currentLongitude || getLocationCoords(b.currentLocation)[1];
                
                const distA = getDistance(passengerCoords[0], passengerCoords[1], aLat, aLng);
                const distB = getDistance(passengerCoords[0], passengerCoords[1], bLat, bLng);
                return distA - distB;
            });
        }
        res.json(rides);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET bookings
app.get("/api/bookings", async (req, res) => {
    try {
        const bookings = await datastore.getBookings();
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST booking (Book a ride)
app.post("/api/bookings", async (req, res) => {
    const { 
        driverName, vehicleType, vehicleNumber, pickup, destination, 
        date, passengers, fare, etaMins, currentLocation,
        passengerName, passengerImage, passengerRating, status, rideId 
    } = req.body;
    
    if (!driverName || !pickup || !destination) {
        return res.status(400).json({ error: "Missing required fields" });
    }
    
    // Security: Validate passenger and Women Only ride restriction on backend
    let isWomenOnlyRide = false;
    try {
        if (rideId) {
            const rideObj = await datastore.getRide(rideId);
            if (rideObj) {
                isWomenOnlyRide = rideObj.womenOnly === true;
                if (isWomenOnlyRide) {
                    const passengerId = passengerName ? passengerName.toLowerCase().replace(/ /g, "_") : "guest_passenger";
                    const passengerObj = await datastore.getUser(passengerId);
                    if (!passengerObj || passengerObj.gender !== "Female") {
                        return res.status(400).json({ error: "This ride is reserved for women passengers." });
                    }
                }
            }
        }
    } catch (err) {
        console.error("Booking validation error:", err.message);
    }

    const newBooking = {
        id: Date.now(),
        driverName,
        vehicleType,
        vehicleNumber,
        pickup,
        destination,
        date: date || new Date().toISOString().split("T")[0],
        passengers: Number(passengers) || 1,
        fare: Number(fare) || 150,
        status: status || "Pending",
        etaMins: Number(etaMins) || 30,
        currentLocation: currentLocation || pickup,
        passengerName: passengerName || "Guest Passenger",
        passengerImage: passengerImage || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80",
        passengerRating: Number(passengerRating) || 4.8,
        rideId: rideId ? String(rideId) : undefined,
        womenOnly: isWomenOnlyRide
    };
    
    try {
        await datastore.addBooking(newBooking);
        res.status(201).json(newBooking);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST ride (Create a ride)
app.post("/api/rides", async (req, res) => {
    const { 
        driverName, driverImage, driverRating, driverTrips, 
        vehicleType, vehicleNumber, currentLocation, destination, 
        availableSeats, fare, etaMins, verified, womenOnly 
    } = req.body;
    
    if (!driverName || !currentLocation || !destination || !vehicleType) {
        return res.status(400).json({ error: "Missing required ride fields" });
    }
    
    const newRide = {
        id: Date.now(),
        driverName,
        driverImage: driverImage || "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&w=120&h=120&q=80",
        driverRating: Number(driverRating) || 4.8,
        driverTrips: Number(driverTrips) || 0,
        vehicleType,
        vehicleNumber: vehicleNumber || "TN-37-XX-9999",
        currentLocation,
        destination,
        availableSeats: Number(availableSeats) || 4,
        passengersOnboard: 0,
        etaMins: Number(etaMins) || 15,
        fare: Number(fare) || 150,
        rideStatus: "ACTIVE", // set Status = ACTIVE
        verified: verified === undefined ? true : verified,
        womenOnly: womenOnly === true
    };
    
    try {
        const createdRide = await datastore.addRide(newRide);
        const io = req.app.get("io");
        if (io) {
            console.log(`Broadcasting ride-created for ride ID: ${newRide.id}`);
            io.emit("ride-created", createdRide);
        }
        res.status(201).json(createdRide);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST accept booking
app.post("/api/bookings/:id/accept", async (req, res) => {
    try {
        const booking = await datastore.confirmBooking(req.params.id);
        if (!booking) {
            return res.status(404).json({ error: "Booking not found" });
        }
        res.json(booking);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET bookings for a specific driver
app.get("/api/bookings/driver/:driverName", async (req, res) => {
    try {
        const bookings = await datastore.getBookingsForDriver(req.params.driverName);
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST cancel booking
app.post("/api/bookings/:id/cancel", async (req, res) => {
    try {
        const booking = await datastore.cancelBooking(req.params.id);
        if (!booking) {
            return res.status(404).json({ error: "Booking not found" });
        }
        res.json(booking);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET wallet balance
app.get("/api/wallet", async (req, res) => {
    try {
        const balance = await datastore.getWalletBalance();
        res.json({ balance });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST top-up wallet
app.post("/api/wallet/topup", async (req, res) => {
    const { amount } = req.body;
    if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
    }
    try {
        const newBalance = await datastore.updateWalletBalance(Number(amount));
        res.json({ balance: newBalance });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET reviews
app.get("/api/reviews", async (req, res) => {
    try {
        const reviews = await datastore.getReviews();
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET users for admin
app.get("/api/users", async (req, res) => {
    try {
        const users = await datastore.getUsers();
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET unverified drivers for admin verification requests
app.get("/api/admin/verification-requests", async (req, res) => {
    try {
        const unverified = await datastore.getUnverifiedDrivers();
        res.json(unverified);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET single driver profile details
app.get("/api/drivers/:driverId", async (req, res) => {
    try {
        const driver = await datastore.getDriver(req.params.driverId);
        if (!driver) {
            return res.status(404).json({ error: "Driver not found", driverId: req.params.driverId });
        }
        res.json(driver);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST register driver details
app.post("/api/drivers/:driverId/register", async (req, res) => {
    try {
        const { fullName, phone, vehicleType, vehicleNumber, availableSeats, licenseNumber, email } = req.body;
        if (!fullName || !phone || !vehicleType || !vehicleNumber || !licenseNumber) {
            return res.status(400).json({ error: "Missing required registration fields" });
        }
        const driverProfile = await datastore.registerDriver(req.params.driverId, {
            fullName,
            phone,
            vehicleType,
            vehicleNumber,
            availableSeats,
            licenseNumber,
            email
        });
        res.json(driverProfile);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST verify driver
app.post("/api/drivers/:driverId/verify", async (req, res) => {
    try {
        const updatedDriver = await datastore.verifyDriver(req.params.driverId);
        res.json(updatedDriver);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST reject driver verification
app.post("/api/drivers/:driverId/reject", async (req, res) => {
    try {
        const updatedDriver = await datastore.rejectDriver(req.params.driverId);
        res.json(updatedDriver);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET single user profile details
app.get("/api/users/:userId", async (req, res) => {
    try {
        const user = await datastore.getUser(req.params.userId);
        if (!user) {
            return res.json({ error: "User not found", userId: req.params.userId });
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST update user profile details (including gender)
app.post("/api/users/:userId", async (req, res) => {
    try {
        const { gender, name, email } = req.body;
        const updatedUser = await datastore.updateUser(req.params.userId, { gender, name, email });
        res.json(updatedUser);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Compatibility fallback endpoints mapping Users to Drivers
app.post("/api/users/:userId/verify", async (req, res) => {
    try {
        const updatedDriver = await datastore.verifyDriver(req.params.userId);
        res.json(updatedDriver);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/users/:userId/reject", async (req, res) => {
    try {
        const updatedDriver = await datastore.rejectDriver(req.params.userId);
        res.json(updatedDriver);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST review
app.post("/api/reviews", async (req, res) => {
    const { driverName, rating, reviewText } = req.body;
    if (!driverName || !rating || !reviewText) {
        return res.status(400).json({ error: "Missing review fields" });
    }
    const newReview = {
        id: Date.now(),
        driverName,
        rating: Number(rating),
        reviewText,
        date: new Date().toISOString().split("T")[0]
    };
    try {
        await datastore.addReview(newReview);
        res.status(201).json(newReview);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Socket.io Real-Time Tracking Integration

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
app.set("io", io);

// Mock path coordinates between Coimbatore Junction and Pollachi Bus Stand
const COIMBATORE_POLLACHI_PATH = [
    [11.0168, 76.9558], // Coimbatore Junction
    [10.9654, 76.9612], // Podanur Bypass
    [10.9123, 76.9658], // Eachanari Bypass
    [10.8712, 76.9745], // Kinathukadavu Highway
    [10.8234, 76.9858], // Kinathukadavu Town
    [10.7432, 76.9923], // Achipatti
    [10.6845, 77.0012], // Pollachi North
    [10.6589, 77.0072]  // Pollachi Bus Stand
];

io.on("connection", (socket) => {
    console.log(`Socket Client connected: ${socket.id}`);

    // Join driver room
    socket.on("join-driver-room", (data) => {
        const { driverName } = data;
        console.log(`Driver "${driverName}" joined socket room driver:${driverName}`);
        socket.join(`driver:${driverName}`);
    });

    // Join booking room (passenger waiting for driver acceptance)
    socket.on("join-booking-room", (data) => {
        const { bookingId } = data;
        console.log(`Passenger joined socket room booking:${bookingId}`);
        socket.join(`booking:${bookingId}`);
    });

    // Passenger books a ride
    socket.on("book-ride", (booking) => {
        console.log(`Booking request received for driver: ${booking.driverName} from passenger: ${booking.passengerName}`);
        
        // Notify the specific driver if online
        io.to(`driver:${booking.driverName}`).emit("ride-requested", {
            id: booking.id,
            passengerName: booking.passengerName,
            passengerImage: booking.passengerImage,
            pickupPoint: booking.pickup,
            destination: booking.destination,
            passengerRating: booking.passengerRating || 4.8,
            passengersCount: booking.passengers,
            estimatedFare: booking.fare,
            etaMins: booking.etaMins,
            womenOnly: booking.womenOnly === true
        });

        // Simulate auto-acceptance after 3 seconds for mock/seeded drivers
        const mockDrivers = ["Rajesh Kumar", "Anand Selvan", "Priya Murugan", "Vikram Rathore", "Senthil Kumar"];
        if (mockDrivers.includes(booking.driverName)) {
            console.log(`Scheduling simulated accept for mock driver: ${booking.driverName}`);
            setTimeout(async () => {
                try {
                    await datastore.confirmBooking(booking.id);
                    io.to(`booking:${booking.id}`).emit("booking-confirmed", { bookingId: booking.id });
                    console.log(`Simulated acceptance emitted for booking ID: ${booking.id}`);
                } catch (e) {
                    console.error("Error in simulated booking confirmation:", e);
                }
            }, 3000);
        }
    });

    // Driver accepts ride request manually
    socket.on("accept-ride", (data) => {
        const { bookingId } = data;
        console.log(`Manual accept-ride event received for booking ID: ${bookingId}`);
        io.to(`booking:${bookingId}`).emit("booking-confirmed", { bookingId });
    });

    // --- REAL-TIME LOCATION & RIDE LIFECYCLE EXTENSIONS ---

    // Join room for real-time ride tracking
    socket.on("join-ride-room", (data) => {
        const { bookingId, userId, role } = data;
        const roomName = `ride:${bookingId}`;
        console.log(`User ${userId} (${role}) joined room: ${roomName}`);
        socket.join(roomName);
    });

    // Listen for coordinate updates from either passenger or driver
    socket.on("location-update", async (data) => {
        const { bookingId, userId, role, lat, lng } = data;
        const roomName = `ride:${bookingId}`;
        console.log(`Received location update from ${role} (${userId}): lat=${lat}, lng=${lng} in room=${roomName}`);

        // 1. Update the Users table in DynamoDB
        const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
        try {
            await datastore.docClient.send(new UpdateCommand({
                TableName: "Users",
                Key: { userId: String(userId) },
                UpdateExpression: "SET currentLatitude = :lat, currentLongitude = :lng, lastUpdated = :now",
                ExpressionAttributeValues: {
                    ":lat": Number(lat),
                    ":lng": Number(lng),
                    ":now": new Date().toISOString()
                }
            }));
        } catch (err) {
            console.error(`Failed to save coordinates for user "${userId}" to Users table:`, err.message);
        }

        // 2. Also update Ride coordinates in Rides table if the updater is a driver
        if (role === "driver") {
            try {
                const booking = await datastore.getBooking(bookingId);
                if (booking && booking.rideId) {
                    await datastore.docClient.send(new UpdateCommand({
                        TableName: "Rides",
                        Key: { rideId: String(booking.rideId) },
                        UpdateExpression: "SET currentLatitude = :lat, currentLongitude = :lng, lastUpdated = :now",
                        ExpressionAttributeValues: {
                            ":lat": Number(lat),
                            ":lng": Number(lng),
                            ":now": new Date().toISOString()
                        }
                    }));
                }
            } catch (err) {
                console.error(`Failed to update Ride coords for booking "${bookingId}":`, err.message);
            }
        }

        // 3. Broadcast the location to the assigned partner only (restrict within room)
        socket.to(roomName).emit("location-broadcast", { userId, role, lat, lng });
    });

    // Listen for ride lifecycle state transitions
    socket.on("update-ride-status", async (data) => {
        const { bookingId, rideId, status } = data;
        const roomName = `ride:${bookingId}`;
        console.log(`Ride status transition for booking ${bookingId} to status: ${status}`);

        const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");

        try {
            // Update Bookings table
            await datastore.docClient.send(new UpdateCommand({
                TableName: "Bookings",
                Key: { bookingId: String(bookingId) },
                UpdateExpression: "SET bookingStatus = :s, #status = :s",
                ExpressionAttributeNames: { "#status": "status" },
                ExpressionAttributeValues: { ":s": status }
            }));

            // Update Rides table
            if (rideId) {
                await datastore.docClient.send(new UpdateCommand({
                    TableName: "Rides",
                    Key: { rideId: String(rideId) },
                    UpdateExpression: "SET rideStatus = :s",
                    ExpressionAttributeValues: { ":s": status }
                }));
            }

            // Save payment history on completion
            if (status === "Completed") {
                try {
                    const booking = await datastore.getBooking(bookingId);
                    if (booking) {
                        await datastore.createPayment({
                            paymentId: String(Date.now()),
                            rideId: booking.rideId,
                            driverName: booking.driverName,
                            passengerName: booking.passengerName,
                            amount: booking.fare
                        });
                        console.log(`Payment history created for completed ride: Driver ${booking.driverName}, Passenger ${booking.passengerName}, Amount ₹${booking.fare}`);
                    }
                } catch (e) {
                    console.error("Failed to log payment on ride completion:", e.message);
                }
            }
        } catch (err) {
            console.error("Error updating ride status in database:", err.message);
        }

        // Broadcast status update to the room
        io.to(roomName).emit("ride-status-changed", { bookingId, rideId, status });
    });

    // Join tracking room (legacy fallback simulator)
    socket.on("track-ride", (data) => {
        const { bookingId } = data;
        console.log(`Client ${socket.id} started legacy tracking for booking ID: ${bookingId}`);
        socket.join(`ride:${bookingId}`);

        const runMockSimulator = async () => {
            const { GetCommand } = require("@aws-sdk/lib-dynamodb");
            try {
                const bRes = await datastore.docClient.send(new GetCommand({
                    TableName: "Bookings",
                    Key: { bookingId: String(bookingId) }
                }));
                const booking = bRes.Item;
                const mockDrivers = ["Rajesh Kumar", "Anand Selvan", "Priya Murugan", "Vikram Rathore", "Senthil Kumar"];
                if (booking && mockDrivers.includes(booking.driverName)) {
                    console.log(`Starting mock simulation for driver: ${booking.driverName}`);
                    let step = 0;
                    const intervalId = setInterval(() => {
                        if (step >= COIMBATORE_POLLACHI_PATH.length) {
                            step = 0; // loop
                        }

                        const currentPos = COIMBATORE_POLLACHI_PATH[step];
                        io.to(`ride:${bookingId}`).emit("ride-update", {
                            bookingId,
                            lat: currentPos[0],
                            lng: currentPos[1],
                            currentLocation: step === 0 ? "Coimbatore Junction" : 
                                             step === 2 ? "Eachanari Bypass" :
                                             step === 4 ? "Kinathukadavu" :
                                             step === 7 ? "Pollachi Bus Stand" : "Highway Node",
                            etaMins: Math.max(0, 40 - step * 5)
                        });

                        step++;
                    }, 3000);

                    socket.on("stop-tracking", () => {
                        clearInterval(intervalId);
                    });

                    socket.on("disconnect", () => {
                        clearInterval(intervalId);
                    });
                }
            } catch (err) {
                console.error("Error in legacy tracking simulation check:", err);
            }
        };

        runMockSimulator();
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});