# Environment Variables Setup

This project uses environment variables for configuration. Follow these steps to set up your environment:

## Backend Setup

1. **Copy the example environment file:**
   ```bash
   cd server
   cp env.example .env
   ```

2. **Edit the `.env` file** with your configuration:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # JWT Configuration
   JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017/todo-board

   # CORS Configuration
   CORS_ORIGIN=http://localhost:3000

   # Socket.IO Configuration
   SOCKET_CORS_ORIGIN=http://localhost:3000
   ```

## Frontend Setup

1. **Copy the example environment file:**
   ```bash
   cp env.example .env
   ```

2. **Edit the `.env` file** with your configuration:
   ```env
   # Frontend Configuration
   REACT_APP_API_URL=http://localhost:5000
   REACT_APP_SOCKET_URL=http://localhost:5000

   # Environment
   REACT_APP_NODE_ENV=development

   # Feature Flags
   REACT_APP_ENABLE_SOCKET=true
   REACT_APP_ENABLE_ACTIVITY_LOG=true
   ```

## Important Notes

- **Never commit `.env` files** to version control
- **Always use strong JWT secrets** in production
- **Update CORS origins** for production deployment
- **React environment variables** must start with `REACT_APP_`
- **Restart the server** after changing environment variables

## Production Deployment

For production, update these variables:

### Backend (.env)
```env
NODE_ENV=production
JWT_SECRET=your_very_secure_production_jwt_secret
MONGODB_URI=your_production_mongodb_uri
CORS_ORIGIN=https://yourdomain.com
SOCKET_CORS_ORIGIN=https://yourdomain.com
```

### Frontend (.env)
```env
REACT_APP_API_URL=https://your-api-domain.com
REACT_APP_SOCKET_URL=https://your-api-domain.com
REACT_APP_NODE_ENV=production
```

## Security Best Practices

1. Use strong, unique JWT secrets
2. Limit CORS origins to your actual domains
3. Use HTTPS in production
4. Regularly rotate secrets
5. Never expose sensitive data in client-side code 