/**
 * Base44 Client
 * 
 * Mode: local (Express backend on localhost:4400)
 * To switch to Base44 hosted backend, set VITE_HAVEN_BACKEND=base44 in .env
 */

// Re-export everything from the local implementation
export { base44, getToken, setToken } from './base44Client.local.js';