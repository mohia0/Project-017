import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useUIStore } from './useUIStore';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProjectStatus = 'Planning' | 'Active' | 'On Hold' | 'Completed' | 'Cancelled';
export type TaskStatus = 'todo' | 'doing' | 'review' | 'done';
export type TaskPriority = 'none' | 'low' | 'medium' | 'high' | 'urgent';
export type ProjectItemType = 'invoice' | 'proposal' | 'file';

export interface ProjectMember {
    id: string;
    name: string;
    avatar_url?: string | null;
}

export interface Project {
    id: string;
    workspace_id: string;
    name: string;
    description?: string | null;
    status: ProjectStatus;
    color: string;
    icon: string;
    client_id?: string | null;
    client_name?: string | null;
    deadline?: string | null;
    members: ProjectMember[];
    is_archived: boolean;
    created_at: string;
}

export interface ProjectTaskGroup {
    id: string;
    project_id: string;
    workspace_id: string;
    name: string;
    position: number;
    color?: string;
    icon?: string;
    created_at: string;
}

export interface ProjectTask {
    id: string;
    project_id: string;
    task_group_id?: string | null;
    workspace_id: string;
    title: string;
    description?: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    assignee?: ProjectMember | null;
    due_date?: string | null;
    start_date?: string | null;
    position: number;
    custom_fields: Record<string, any>;
    is_archived: boolean;
    created_at: string;
}

export interface ProjectItem {
    id: string;
    project_id: string;
    workspace_id: string;
    item_type: ProjectItemType;
    item_id: string;
    created_at: string;
}

// ─── State ────────────────────────────────────────────────────────────────────

interface ProjectState {
    // Projects
    projects: Project[];
    isLoading: boolean;
    error: string | null;
    fetchProjects: () => Promise<void>;
    addProject: (project: Omit<Project, 'id' | 'created_at' | 'workspace_id'>) => Promise<Project | null>;
    updateProject: (id: string, updates: Partial<Project>) => Promise<boolean>;
    deleteProject: (id: string) => Promise<boolean>;
    bulkDeleteProjects: (ids: string[]) => Promise<void>;
    bulkDuplicateProjects: (ids: string[]) => Promise<void>;

    // Tasks (keyed by projectId)
    tasksByProject: Record<string, ProjectTask[]>;
    tasksLoading: Record<string, boolean>;
    fetchTasks: (projectId: string) => Promise<void>;
    addTask: (task: Omit<ProjectTask, 'id' | 'created_at' | 'workspace_id'>) => Promise<ProjectTask | null>;
    updateTask: (id: string, projectId: string, updates: Partial<ProjectTask>) => Promise<void>;
    deleteTask: (id: string, projectId: string) => Promise<void>;
    reorderTask: (id: string, projectId: string, destGroupId: string | null, newPosition: number) => Promise<void>;

    // Task Groups (keyed by projectId)
    groupsByProject: Record<string, ProjectTaskGroup[]>;
    fetchTaskGroups: (projectId: string) => Promise<void>;
    addTaskGroup: (group: Omit<ProjectTaskGroup, 'id' | 'created_at' | 'workspace_id'>) => Promise<ProjectTaskGroup | null>;
    updateTaskGroup: (id: string, projectId: string, updates: Partial<ProjectTaskGroup>) => Promise<void>;
    deleteTaskGroup: (id: string, projectId: string) => Promise<void>;
    reorderTaskGroup: (id: string, projectId: string, newPosition: number) => Promise<void>;

    // Linked Items (keyed by projectId)
    itemsByProject: Record<string, ProjectItem[]>;
    fetchProjectItems: (projectId: string) => Promise<void>;
    addProjectItem: (item: Omit<ProjectItem, 'id' | 'created_at' | 'workspace_id'>) => Promise<ProjectItem | null>;
    removeProjectItem: (id: string, projectId: string) => Promise<void>;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useProjectStore = create<ProjectState>((set, get) => ({
    projects: [],
    isLoading: false,
    error: null,
    tasksByProject: {},
    tasksLoading: {},
    groupsByProject: {},
    itemsByProject: {},

    // ── Projects ──────────────────────────────────────────────────────────────

    fetchProjects: async () => {
        const workspaceId = useUIStore.getState().activeWorkspaceId;
        if (!workspaceId) { set({ projects: [], isLoading: false }); return; }

        const hasData = get().projects.length > 0;
        if (!hasData) set({ isLoading: true, error: null });

        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false });

        if (error) set({ error: error.message, isLoading: false });
        else       set({ projects: (data as Project[]) || [], isLoading: false });
    },

    addProject: async (project) => {
        const workspaceId = useUIStore.getState().activeWorkspaceId;
        if (!workspaceId) return null;
        try {
            const payload = { ...project, workspace_id: workspaceId };
            const { data, error } = await supabase.from('projects').insert(payload).select().single();
            if (error) { set({ error: error.message }); return null; }
            if (data) {
                set((s) => ({ projects: [data as Project, ...s.projects] }));
                return data as Project;
            }
            return null;
        } catch (err: any) {
            set({ error: err.message });
            return null;
        }
    },

    updateProject: async (id, updates) => {
        // Optimistic
        set((s) => ({ projects: s.projects.map((p) => p.id === id ? { ...p, ...updates } : p) }));
        const { data, error } = await supabase.from('projects').update(updates).eq('id', id).select().single();
        if (error) {
            set({ error: error.message });
            return false;
        }
        if (data) set((s) => ({ projects: s.projects.map((p) => p.id === id ? data as Project : p) }));
        return true;
    },

    deleteProject: async (id) => {
        const { error } = await supabase.from('projects').delete().eq('id', id);
        if (error) {
            set({ error: error.message });
            return false;
        }
        set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }));
        return true;
    },

    bulkDeleteProjects: async (ids) => {
        if (!ids.length) return;
        const { error } = await supabase.from('projects').delete().in('id', ids);
        if (error) set({ error: error.message });
        else set((s) => ({ projects: s.projects.filter((p) => !ids.includes(p.id)) }));
    },

    bulkDuplicateProjects: async (ids) => {
        const workspaceId = useUIStore.getState().activeWorkspaceId;
        if (!workspaceId || !ids.length) return;

        const projectsToDup = get().projects.filter(p => ids.includes(p.id));
        const payloads = projectsToDup.map(p => {
            const { id, created_at, ...rest } = p;
            return {
                ...rest,
                name: `${p.name} (Copy)`,
                workspace_id: workspaceId
            };
        });

        const { data, error } = await supabase.from('projects').insert(payloads).select();
        if (error) set({ error: error.message });
        else if (data) set(s => ({ projects: [...(data as Project[]), ...s.projects] }));
    },

    // ── Tasks ─────────────────────────────────────────────────────────────────

    fetchTasks: async (projectId) => {
        set((s) => ({ tasksLoading: { ...s.tasksLoading, [projectId]: true } }));
        const workspaceId = useUIStore.getState().activeWorkspaceId;
        if (!workspaceId) { set((s) => ({ tasksLoading: { ...s.tasksLoading, [projectId]: false } })); return; }

        const { data, error } = await supabase
            .from('project_tasks')
            .select('*')
            .eq('project_id', projectId)
            .eq('workspace_id', workspaceId)
            .order('position', { ascending: true });

        set((s) => ({
            tasksByProject: { ...s.tasksByProject, [projectId]: error ? [] : (data as ProjectTask[]) || [] },
            tasksLoading: { ...s.tasksLoading, [projectId]: false },
        }));
    },

    addTask: async (task) => {
        const workspaceId = useUIStore.getState().activeWorkspaceId;
        if (!workspaceId) return null;
        try {
            const payload = { ...task, workspace_id: workspaceId };
            const { data, error } = await supabase.from('project_tasks').insert(payload).select().single();
            if (error) { set({ error: error.message }); return null; }
            if (data) {
                const t = data as ProjectTask;
                set((s) => ({
                    tasksByProject: {
                        ...s.tasksByProject,
                        [task.project_id]: [...(s.tasksByProject[task.project_id] || []), t],
                    },
                }));
                return t;
            }
            return null;
        } catch (err: any) {
            set({ error: err.message });
            return null;
        }
    },

    updateTask: async (id, projectId, updates) => {
        // Optimistic
        set((s) => ({
            tasksByProject: {
                ...s.tasksByProject,
                [projectId]: (s.tasksByProject[projectId] || []).map((t) => t.id === id ? { ...t, ...updates } : t),
            },
        }));
        const { data, error } = await supabase.from('project_tasks').update(updates).eq('id', id).select().single();
        if (error) set({ error: error.message });
        else if (data) {
            set((s) => ({
                tasksByProject: {
                    ...s.tasksByProject,
                    [projectId]: (s.tasksByProject[projectId] || []).map((t) => t.id === id ? data as ProjectTask : t),
                },
            }));
        }
    },

    deleteTask: async (id, projectId) => {
        const { error } = await supabase.from('project_tasks').delete().eq('id', id);
        if (error) set({ error: error.message });
        else set((s) => ({
            tasksByProject: {
                ...s.tasksByProject,
                [projectId]: (s.tasksByProject[projectId] || []).filter((t) => t.id !== id),
            },
        }));
    },

    reorderTask: async (id, projectId, destGroupId, newPosition) => {
        let finalUpdates: any[] = [];
        set((s) => {
            const projectTasks = [...(s.tasksByProject[projectId] || [])];
            const taskIndex = projectTasks.findIndex((t) => t.id === id);
            if (taskIndex === -1) return s;

            // 1. Create a clone of the dragged task with updated group
            const clonedTask = { ...projectTasks[taskIndex], task_group_id: destGroupId };

            // 2. Extract out other tasks in the destination group
            let colTasks = projectTasks
                .filter((t) => t.task_group_id === destGroupId && t.id !== id)
                .sort((a, b) => a.position - b.position);

            // 3. Insert the cloned task at the new position
            colTasks.splice(newPosition, 0, clonedTask);

            // 4. Map them to strictly new objects with updated positions
            colTasks = colTasks.map((t, i) => ({ ...t, position: i }));

            // Save updates payload for Supabase
            finalUpdates = colTasks.map((t) => ({
                id: t.id,
                position: t.position,
                task_group_id: t.task_group_id,
            }));

            // 5. Build the fully updated project tasks array
            const nextProjectTasks = projectTasks.map((t) => {
                if (t.id === id) return clonedTask;
                const updatedChild = colTasks.find(ct => ct.id === t.id);
                if (updatedChild) return updatedChild;
                return t;
            });

            return {
                tasksByProject: {
                    ...s.tasksByProject,
                    [projectId]: nextProjectTasks,
                },
            };
        });

        // Supabase sync using single UPDATE queries to avoid upsert null constraint errors
        if (finalUpdates.length > 0) {
            await Promise.all(finalUpdates.map((t) => 
                supabase.from('project_tasks').update({
                    position: t.position,
                    task_group_id: t.task_group_id,
                }).eq('id', t.id)
            ));
        }
    },

    // ── Task Groups ───────────────────────────────────────────────────────────

    fetchTaskGroups: async (projectId) => {
        const workspaceId = useUIStore.getState().activeWorkspaceId;
        if (!workspaceId) return;

        const { data, error } = await supabase
            .from('project_task_groups')
            .select('*')
            .eq('project_id', projectId)
            .order('position', { ascending: true });

        if (!error) set((s) => ({
            groupsByProject: { ...s.groupsByProject, [projectId]: (data as ProjectTaskGroup[]) || [] },
        }));
    },

    addTaskGroup: async (group) => {
        const workspaceId = useUIStore.getState().activeWorkspaceId;
        if (!workspaceId) return null;
        const payload = { ...group, workspace_id: workspaceId };
        const { data, error } = await supabase.from('project_task_groups').insert(payload).select().single();
        if (error) { 
            console.error("addTaskGroup Error:", error);
            set({ error: error.message }); 
            alert("Failed to create group: " + error.message);
            return null; 
        }
        if (data) {
            const g = data as ProjectTaskGroup;
            set((s) => ({
                groupsByProject: {
                    ...s.groupsByProject,
                    [group.project_id]: [...(s.groupsByProject[group.project_id] || []), g],
                },
            }));
            return g;
        }
        return null;
    },

    updateTaskGroup: async (id, projectId, updates) => {
        set((s) => ({
            groupsByProject: {
                ...s.groupsByProject,
                [projectId]: (s.groupsByProject[projectId] || []).map((g) => g.id === id ? { ...g, ...updates } : g),
            },
        }));
        await supabase.from('project_task_groups').update(updates).eq('id', id);
    },

    deleteTaskGroup: async (id, projectId) => {
        await supabase.from('project_task_groups').delete().eq('id', id);
        set((s) => ({
            groupsByProject: {
                ...s.groupsByProject,
                [projectId]: (s.groupsByProject[projectId] || []).filter((g) => g.id !== id),
            },
        }));
    },

    reorderTaskGroup: async (id, projectId, newPosition) => {
        let finalUpdates: any[] = [];
        set((s) => {
            const projectGroups = [...(s.groupsByProject[projectId] || [])].sort((a, b) => a.position - b.position);
            const groupIndex = projectGroups.findIndex((g) => g.id === id);
            if (groupIndex === -1) return s;

            // 1. Remove the group to be moved
            const [group] = projectGroups.splice(groupIndex, 1);
            
            // 2. Clone the group to maintain immutability
            const clonedGroup = { ...group };

            // 3. Insert into the new position
            projectGroups.splice(newPosition, 0, clonedGroup);

            // 4. Map the entire array to new objects with updated positions
            const nextProjectGroups = projectGroups.map((g, i) => ({
                ...g,
                position: i
            }));

            // Save updates payload for Supabase
            finalUpdates = nextProjectGroups.map((g) => ({
                id: g.id,
                position: g.position,
            }));

            return {
                groupsByProject: {
                    ...s.groupsByProject,
                    [projectId]: nextProjectGroups,
                },
            };
        });

        // Supabase sync using single UPDATE queries
        if (finalUpdates.length > 0) {
            await Promise.all(finalUpdates.map((g) => 
                supabase.from('project_task_groups').update({
                    position: g.position,
                }).eq('id', g.id)
            ));
        }
    },

    // ── Linked Items ──────────────────────────────────────────────────────────

    fetchProjectItems: async (projectId) => {
        const workspaceId = useUIStore.getState().activeWorkspaceId;
        if (!workspaceId) return;

        const { data, error } = await supabase
            .from('project_items')
            .select('*')
            .eq('project_id', projectId);

        if (!error) set((s) => ({
            itemsByProject: { ...s.itemsByProject, [projectId]: (data as ProjectItem[]) || [] },
        }));
    },

    addProjectItem: async (item) => {
        const workspaceId = useUIStore.getState().activeWorkspaceId;
        if (!workspaceId) return null;
        const payload = { ...item, workspace_id: workspaceId };
        const { data, error } = await supabase.from('project_items').insert(payload).select().single();
        if (error) { set({ error: error.message }); return null; }
        if (data) {
            const it = data as ProjectItem;
            set((s) => ({
                itemsByProject: {
                    ...s.itemsByProject,
                    [item.project_id]: [...(s.itemsByProject[item.project_id] || []), it],
                },
            }));
            return it;
        }
        return null;
    },

    removeProjectItem: async (id, projectId) => {
        await supabase.from('project_items').delete().eq('id', id);
        set((s) => ({
            itemsByProject: {
                ...s.itemsByProject,
                [projectId]: (s.itemsByProject[projectId] || []).filter((i) => i.id !== id),
            },
        }));
    },
}));
