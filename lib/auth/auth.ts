// lib/auth/auth.ts
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { initializeUserBoard } from "../init-user-board";
import connectDB from "../db";

const mongooseInstance = await connectDB();


const client = mongooseInstance.connection.getClient();
const db = mongooseInstance.connection.db;

if (!db) {
    throw new Error("MongoDB database instance is not defined inside Mongoose connection.");
}

export const auth = betterAuth({
    // 3. Pass the native objects to the Better Auth adapter
    database: mongodbAdapter(db, {
        client,
    }),
    session: {
        cookieCache: {
            enabled: true,
            maxAge: 60 * 60
        },
    },
    emailAndPassword: {
        enabled: true
    },
    databaseHooks: {
        user: {
            create: {
                after: async (user) => {
                    if (user.id) {
                        await initializeUserBoard(user.id);
                    }
                }
            }
        }
    }
});

export const getSession = async () => {
    const result = await auth.api.getSession({
        headers: await headers(),
    });
    return result;
};

export const signOut = async () => {
    const result = await auth.api.signOut({
        headers: await headers(),
    });

    if (result.success) {
        redirect("/sign-in");
    }
};