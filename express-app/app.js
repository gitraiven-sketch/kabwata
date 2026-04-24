const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const indexRouter = require('./routes/index');
const tenantsRouter = require('./routes/tenants');
const propertiesRouter = require('./routes/properties');
const remindersRouter = require('./routes/reminders');
const authRouter = require('./routes/auth');
const apiRouter = require('./routes/api');

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/tenants', tenantsRouter);
app.use('/properties', propertiesRouter);
app.use('/reminders', remindersRouter);
app.use('/', authRouter);
app.use('/api', apiRouter);

app.use((req, res) => {
  res.status(404).render('404', { url: req.originalUrl });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('500', { error: err });
});

app.listen(port, () => {
  console.log(`Express app listening on http://localhost:${port}`);
});