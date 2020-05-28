if(process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

const express = require('express')
const app = express()
const bcrypt = require('bcrypt')
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
const methodOverride = require('method-override')
const users = [] 
const users2 = {} // for socket io to store users
let count = 0
const server = app.listen(process.env.PORT || 3000)
const socket = require('socket.io')
const io = socket.listen(server)//for local hosting

io.on('connection', socket => {
    socket.on('new-user', name => {
        users2[socket.id] = name
        socket.broadcast.emit('user-connected', name)
    })
    socket.on('send-chat-message', message => {
        socket.broadcast.emit('chat-message', {message: message, name: users2[socket.id]})
    })
})

const initializePassport = require('./passport-config')
initializePassport(
    passport, 
    email => users.find(user => user.email === email),
    id => users.find(user => user.id === id),
)

app.use("/static", express.static('./static/'));
app.set('view-engine', 'ejs')
app.use(express.urlencoded({ extended: false }))
app.use(flash())
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))

app.get('/', checkAuthenticated, (req,res) => {
    res.render('index.ejs', { name: req.user.name })
})

app.get('/bmi', checkAuthenticated, (req,res) => {
    res.render('bmi.ejs', { name: req.user.name})
})

app.get('/chat', checkAuthenticated, (req,res) => {
    res.render('chat.ejs', { name: req.user.name})
})

app.get('/account', checkAuthenticated, (req,res) => {
    res.render('account.ejs', { name: req.user.name, email: req.user.email, bmi: req.user.bmi})
})

app.get('/diet', checkAuthenticated, (req,res) => {
    res.render('diet.ejs', { name: req.user.name, bmi: req.user.bmi})
})

app.get('/shop', checkAuthenticated, (req,res) => {
    res.render('shop.ejs', { name: req.user.name })
})

app.get('/cart', checkAuthenticated, (req,res) => {
    res.render('cart.ejs', { name: req.user.name })
})

app.get('/blogs', checkAuthenticated, (req,res) => {
    res.render('blogs.ejs', { name: req.user.name })
})

app.get('/login', checkNotAuthenticated, (req,res) => {
    res.render('login.ejs')
})

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
}))

app.get('/register', checkNotAuthenticated, (req,res) => {
    res.render('register.ejs')
})

app.post('/bmi', checkAuthenticated, (req,res) => {
    users[count - 1].bmi = req.body.bmi
    res.redirect('/bmi')
    console.log(users)
})

app.post('/register', checkNotAuthenticated, async (req,res) => {
    try{
        const hashedPassword = await bcrypt.hash(req.body.password, 10)
        users.push({
            id: Date.now().toString(),
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword,
            bmi: null
        })
        count++;
        res.redirect('/login')
    } catch {
        res.redirect('/register')
    }  
    console.log(users)
})

app.delete('/logout', (req, res) => {
    req.logOut()//from passport
    res.redirect('/login')
})

function checkAuthenticated(req, res, next) {
    if(req.isAuthenticated()){
        return next()
    }
    res.redirect('/login')
}

function checkNotAuthenticated(req, res, next) {
    if(req.isAuthenticated()){
        return res.redirect('/')
    }
    next()
}


