import { Client, Account, Databases, Teams, Storage } from 'appwrite'

export const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID)

export const account = new Account(client)
export const db = new Databases(client)
export const teams = new Teams(client)
export const storage = new Storage(client)
