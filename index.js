const express = require('express');
const app = express();
const port = 5000;
const request = require('request');

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccount = require('./key.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

// Set EJS as the view engine
app.set("view engine", "ejs");

// Middleware to parse form data (Use Express directly)
app.use(express.urlencoded({ extended: true }));

// Serve static files from 'public' folder
app.use(express.static('public'));

// Home route
app.get('/', (req, res) => {
    res.render('home');  // Renders the home.ejs template
});

// Signup route
app.get('/signup', (req, res) => {
    res.render("signup");
});

const bcrypt = require('bcrypt');

app.post('/signupsubmit', async (req, res) => {
    const { name, email, pwd } = req.body;
    const hashedPassword = await bcrypt.hash(pwd, 10); // Hash password

    db.collection('users').add({ name, email, password: hashedPassword })
        .then(() => res.redirect('/signin'))
        .catch(err => console.error("Signup error:", err));
});

// Sign-in route
app.get('/signin', (req, res) => {
    res.render("signin");
});

app.post('/signinsubmit', async (req, res) => {
    const { email, password } = req.body;

    db.collection("users").where("email", "==", email).get()
        .then(async (docs) => {
            if (docs.size > 0) {
                const user = docs.docs[0].data();
                const validPassword = await bcrypt.compare(password, user.password);

                if (validPassword) {
                    res.render("currency", { error: null, rates: null });
                } else {
                    res.redirect("/signinfail");
                }
            } else {
                res.redirect("/signinfail");
            }
        })
        .catch(err => {
            console.error("Signin error:", err);
            res.redirect("/signinfail");
        });
});


// Currency conversion route
app.get('/currency', (req, res) => {
    res.render('currency', { error: null, rates: null });
});

// Currency conversion API request
const API_KEY = "Your key here"; // <-- Place your API key here

app.get('/convert', (req, res) => {
    const base = req.query.base || 'USD';
    const symbols = req.query.symbols || 'EUR,GBP,INR,PKR';

    console.log(`Fetching currency data for base: ${base}, symbols: ${symbols}`);

    request.get({
        url: `https://api.currencyfreaks.com/v2.0/rates/latest?apikey=${API_KEY}&symbols=${symbols}&base=${base}`
    }, function (error, response, body) {
        if (error) {
            console.error('Error fetching currency data:', error);
            return res.render('currency', { error: 'API request failed.', rates: null });
        }

        try {
            const data = JSON.parse(body);
            if (!data.rates) {
                console.error('Invalid API response:', data);
                return res.render('currency', { error: 'Invalid exchange rate data.', rates: null });
            }

            res.render('currency', { error: null, rates: data.rates });

        } catch (parseError) {
            console.error('Error parsing API response:', parseError);
            return res.render('currency', { error: 'Failed to process exchange rate data.', rates: null });
        }
    });
});



// Sign-in failure page
app.get('/signinfail', (req, res) => {
    res.render("signinfail");
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
