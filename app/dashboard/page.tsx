import { getSession } from "@/lib/auth/auth";
import connectDB from "@/lib/db";
import { Board } from "@/lib/models";
import { redirect } from "next/navigation";
import KanbanBoard from "@/components/kanban-board";
import { Suspense } from "react";
import mongoose from "mongoose"; // 💡 Added for Type casting

async function getBoard(userId: string) {
  // ❌ REMOVED "use cache" to prevent data freeze issues
  await connectDB();

  // 💡 1. Explicitly convert string ID into a clean MongoDB ObjectId
  const queryUserId = mongoose.Types.ObjectId.isValid(userId)
    ? new mongoose.Types.ObjectId(userId)
    : userId;

  const boardDoc = await Board.findOne({
    userId: queryUserId,
    name: "Job Hunt",
  }).populate({
    path: "columns",
    populate: {
      path: "jobApplications",
    },
  });

  if (!boardDoc) return null;

  return JSON.parse(JSON.stringify(boardDoc));
}

async function DashboardPage() {
  const session = await getSession();

  // 💡 2. Validate session FIRST before fetching data to guarantee an ID exists
  if (!session?.user) {
    redirect("/sign-in");
  }

  const board = await getBoard(session.user.id);

  // 💡 3. Fallback screen to catch empty database records gracefully
  if (!board) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center max-w-md border p-6 rounded-xl shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Active Board Found</h2>
          <p className="text-sm text-gray-500 mb-4">
            We authenticated user <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">{session.user.id}</code>, 
            but no board named <strong>"Job Hunt"</strong> matches this ID in your MongoDB cluster.
          </p>
          <p className="text-xs text-gray-400">
            Please make sure your database contains a document with this exact user ID.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-black">Job Hunt</h1>
          <p className="text-gray-600">Track your job applications</p>
        </div>
        <KanbanBoard board={board} userId={session.user.id} />
      </div>
    </div>
  );
}

export default async function Dashboard() {
  return (
    <Suspense fallback={<div className="p-6 font-medium text-black">Loading Board Data...</div>}>
      <DashboardPage />
    </Suspense>
  );
}