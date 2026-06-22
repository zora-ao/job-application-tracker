"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "../auth/auth";
import { Board, Column, JobApplication } from "../models";

interface JobApplicationData {
    company: string;
    position: string;
    location?: string;
    notes?: string;
    salary?: string;
    jobUrl?: string;
    columnId: string;
    boardId: string;
    tags?: string[];
    description?: string;
}

export const createJobApplication = async (data: JobApplicationData) => {
    const session = await getSession();
    if (!session?.user) return { error: "Unauthorized" };

    const { company, position, location, notes, salary, jobUrl, columnId, boardId, tags, description } = data;

    if (!company || !position || !columnId || !boardId) {
        return { error: "Missing required fields" };
    }

    const board = await Board.findOne({ _id: boardId, userId: session.user.id });
    if (!board) return { error: "Board not found" };

    const column = await Column.findOne({ _id: columnId, boardId });
    if (!column) return { error: "Column not found" };

    // Consistently use steps of 1000 for ordering
    const maxOrderJob = await JobApplication.findOne({ columnId })
        .sort({ order: -1 })
        .select("order")
        .lean();

    const nextOrder = maxOrderJob ? maxOrderJob.order + 1000 : 1000;

    const jobApplication = await JobApplication.create({
        company,
        position,
        location,
        notes,
        salary,
        jobUrl,
        columnId,
        boardId,
        userId: session.user.id,
        tags: tags || [],
        description,
        status: "applied",
        order: nextOrder,
    });

    await Column.findByIdAndUpdate(columnId, {
        $push: { jobApplications: jobApplication._id }
    });

    revalidatePath("/dashboard");
    return { data: JSON.parse(JSON.stringify(jobApplication)) };
};

export const updateJobApplication = async (
    id: string,
    updates: {
        company?: string;
        position?: string;
        location?: string;
        notes?: string;
        salary?: string;
        jobUrl?: string;
        columnId?: string;
        order?: number; // Representing the index array position from the UI drag event
        tags?: string[];
        description?: string;
    }
) => {
    const session = await getSession();
    if (!session?.user) return { error: "Unauthorized" };

    const jobApplication = await JobApplication.findById(id);
    if (!jobApplication) return { error: "Job application not found" };
    if (jobApplication.userId !== session.user.id) return { error: "Unauthorized" };

    const { columnId, order, ...otherUpdates } = updates;
    const updatesToApply: any = { ...otherUpdates };

    const currentColumnId = jobApplication.columnId.toString();
    const newColumnId = columnId ? columnId.toString() : currentColumnId;
    const isMovingToDifferentColumn = newColumnId !== currentColumnId;

    // Handle column moving arrays early
    if (isMovingToDifferentColumn) {
        // ✅ FIXED TYPO: changed jobApplication to jobApplications
        await Column.findByIdAndUpdate(currentColumnId, {
            $pull: { jobApplications: id },
        });
        await Column.findByIdAndUpdate(newColumnId, {
            $push: { jobApplications: id }
        });
        updatesToApply.columnId = newColumnId;
    }

    // Process ordering logic safely
    if (order !== undefined && order !== null) {
        const jobsInTargetColumn = await JobApplication.find({
            columnId: newColumnId,
            _id: { $ne: id }
        }).sort({ order: 1 }).lean();

        let newOrderValue: number;

        if (jobsInTargetColumn.length === 0) {
            newOrderValue = 1000;
        } else if (order === 0) {
            // Dragged to the absolute top
            newOrderValue = jobsInTargetColumn[0].order / 2;
        } else if (order >= jobsInTargetColumn.length) {
            // Dragged to the absolute bottom
            newOrderValue = jobsInTargetColumn[jobsInTargetColumn.length - 1].order + 1000;
        } else {
            // Dragged between two existing items: find midpoint to prevent manual loops!
            const prevJobOrder = jobsInTargetColumn[order - 1].order;
            const nextJobOrder = jobsInTargetColumn[order].order;
            newOrderValue = prevJobOrder + (nextJobOrder - prevJobOrder) / 2;
        }

        updatesToApply.order = newOrderValue;
    }

    const updated = await JobApplication.findByIdAndUpdate(id, updatesToApply, { new: true });

    revalidatePath("/dashboard");
    return { data: JSON.parse(JSON.stringify(updated)) };
};

export const deleteJobApplication = async(id: string) => {
    const session = await getSession();

    if(!session?.user){
        return {error: "Unauthorized"}
    }

    const jobApplication = await JobApplication.findById(id);

    if (!jobApplication) {
        return {error: "Job  application not found"}
    }

    if(jobApplication.userId !== session.user.id){
        return {error: "Unauthorized"}
    }

    await Column.findByIdAndUpdate(jobApplication.columnId, {
        $pull: {jobApplications: id}
    });

    await JobApplication.deleteOne({_id: id});

    revalidatePath("/dashboard")

    return {success: true};

}

export default createJobApplication;