# Rental Management System - Express.js Version

This is an Express.js implementation of the rental management system, providing a web interface for managing tenants, properties, and rent reminders.

## Features

- **Dashboard**: Overview of tenants, properties, and overdue payments
- **Tenants Management**: View tenant details, payment history, and status
- **Properties Management**: Manage property information and assigned tenants
- **Reminders**: Track rent due dates and overdue tenants
- **API Endpoints**: JSON API for data access

## Installation

1. Navigate to the express-app directory:
   ```bash
   cd express-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Open your browser and go to `http://localhost:3000`

## Project Structure

```
express-app/
├── app.js              # Main application file
├── data.js             # Sample data and business logic
├── package.json        # Dependencies and scripts
├── routes/             # Route handlers
│   ├── index.js        # Dashboard routes
│   ├── tenants.js      # Tenant routes
│   ├── properties.js   # Property routes
│   ├── reminders.js    # Reminder routes
│   └── api.js          # API routes
├── views/              # EJS templates
│   ├── layout.ejs      # Main layout
│   ├── index.ejs       # Dashboard
│   ├── tenants/
│   ├── properties/
│   ├── reminders/
│   ├── 404.ejs         # 404 error page
│   └── 500.ejs         # 500 error page
└── public/             # Static assets
    └── styles.css      # Custom styles
```

## API Endpoints

- `GET /api/tenants` - Get all tenants with details
- `GET /api/properties` - Get property summary
- `GET /api/overdue` - Get overdue tenants

## Technologies Used

- **Express.js**: Web framework
- **EJS**: Template engine
- **Bootstrap 5**: CSS framework
- **Font Awesome**: Icons
- **Node.js**: Runtime environment

## Development

The app uses sample data stored in `data.js`. In a production environment, this would be replaced with a database connection.

## License

This project is part of the rental management system and follows the same licensing as the main project.