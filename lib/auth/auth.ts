import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { initializeUserBoard } from "../init-user-board";
import connectDB from "../db";
import mongoose from "mongoose";

// A proxy object that lazily retrieves the DB/Client whenever Better Auth runs a query
const getDbConfig = () => {
    // If mongoose hasn't initialized its connection yet, trigger it 
    // (This is safe during runtime, and won't crash during build)
    if (mongoose.connection.readyState === 0) {
        connectDB(); 
    }
    
    const client = mongoose.connection.getClient();
    const db = mongoose.connection.db;

    if (!db || !client) {
        // Fallback or dummy object for the strict build phase so compilation succeeds
        return { db: {} as any, client: {} as any };
    }

    return { db, client };
};

export const auth = betterAuth({
    // Satisfy TypeScript by passing the objects directly using getters
    database: mongodbAdapter(getDbConfig().db, {
        get client() {
            return getDbConfig().client;
        }
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