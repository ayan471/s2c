/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useProjectCreation } from "@/hooks/use-project";
import { useFolders } from "@/hooks/use-folders";
import { formatDistanceToNow } from "date-fns";
import {
  Plus,
  MoreVertical,
  Trash2,
  FolderPlus,
  Edit2,
  Folder,
  ChevronRight,
  Home,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useAppSelector } from "@/redux/store";
import { ProjectContextMenu } from "../context-menu";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Id } from "../../../../convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export const ProjectsList = () => {
  const { canCreate } = useProjectCreation();
  const user = useAppSelector((state) => state.profile);
  const [currentFolder, setCurrentFolder] = useState<Id<"folders"> | null>(
    null
  );
  const {
    folders,
    isCreatingFolder,
    folderName,
    setFolderName,
    setIsCreatingFolder,
    handleCreateFolder,
    handleDeleteFolder,
    handleMoveProject,
    handleDeleteProject,
    handleRenameProject,
    handleRenameFolder,
  } = useFolders(user.id as Id<"users">);

  // Fetch projects filtered by current folder
  const projects = useQuery(
    api.projects.getUserProjects,
    user?.id
      ? {
          userId: user.id as Id<"users">,
          folderId: currentFolder,
        }
      : "skip"
  );

  const [projectToDelete, setProjectToDelete] = useState<{
    id: Id<"projects">;
    name: string;
  } | null>(null);

  const [editingProject, setEditingProject] = useState<Id<"projects"> | null>(
    null
  );
  const [editingName, setEditingName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<Id<"folders"> | null>(
    null
  );
  const [editingFolderName, setEditingFolderName] = useState("");
  const [draggedProject, setDraggedProject] = useState<Id<"projects"> | null>(
    null
  );
  const [dragOverFolder, setDragOverFolder] = useState<Id<"folders"> | null>(
    null
  );
  const [isRootDropActive, setIsRootDropActive] = useState(false);

  // Get current folder name for breadcrumbs
  const currentFolderName = currentFolder
    ? folders.find((f) => f._id === currentFolder)?.name
    : null;

  // Count projects in each folder
  const allProjects = useQuery(
    api.projects.getUserProjects,
    user?.id ? { userId: user.id as Id<"users"> } : "skip"
  );

  const getProjectCount = (folderId: Id<"folders">) => {
    return allProjects?.filter((p) => p.folderId === folderId).length || 0;
  };

  if (!canCreate) {
    return (
      <div className="text-center py-12">
        <p className="text-lg">Please sign in to view your projects.</p>
      </div>
    );
  }

  const handleDeleteClick = (
    projectId: Id<"projects">,
    projectName: string
  ) => {
    setProjectToDelete({ id: projectId, name: projectName });
  };

  const confirmDelete = async () => {
    if (projectToDelete) {
      await handleDeleteProject(projectToDelete.id);
      setProjectToDelete(null);
    }
  };

  const startEditing = (projectId: Id<"projects">, currentName: string) => {
    setEditingProject(projectId);
    setEditingName(currentName);
  };

  const cancelEditing = () => {
    setEditingProject(null);
    setEditingName("");
  };

  const saveRename = async (projectId: Id<"projects">) => {
    const success = await handleRenameProject(projectId, editingName);
    if (success) {
      cancelEditing();
    }
  };

  const startEditingFolder = (folderId: Id<"folders">, currentName: string) => {
    setEditingFolderId(folderId);
    setEditingFolderName(currentName);
  };

  const cancelEditingFolder = () => {
    setEditingFolderId(null);
    setEditingFolderName("");
  };

  const saveFolderRename = async (folderId: Id<"folders">) => {
    const success = await handleRenameFolder(folderId, editingFolderName);
    if (success) {
      cancelEditingFolder();
    }
  };

  // Drag and drop handlers
  const handleDragStart = (projectId: Id<"projects">) => {
    setDraggedProject(projectId);
  };

  const handleDragEnd = () => {
    setDraggedProject(null);
    setDragOverFolder(null);
    setIsRootDropActive(false);
  };

  const handleDragOver = (
    e: React.DragEvent,
    folderId: Id<"folders"> | null
  ) => {
    e.preventDefault();
    setDragOverFolder(folderId);
  };

  const handleDragLeave = () => {
    setDragOverFolder(null);
  };

  const handleDrop = async (
    e: React.DragEvent,
    folderId: Id<"folders"> | null
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedProject) {
      await handleMoveProject(draggedProject, folderId);
      setDraggedProject(null);
      setDragOverFolder(null);
      setIsRootDropActive(false);
    }
  };

  const handleRootDragOver = (e: React.DragEvent) => {
    if (!draggedProject || !currentFolder) return;
    e.preventDefault();
    setDragOverFolder(null);
    setIsRootDropActive(true);
  };

  const handleRootDragLeave = (e: React.DragEvent) => {
    const nextTarget = e.relatedTarget as Node | null;
    if (!nextTarget || !(e.currentTarget as HTMLElement).contains(nextTarget)) {
      setIsRootDropActive(false);
    }
  };

  const handleRootDrop = async (e: React.DragEvent) => {
    if (!draggedProject || !currentFolder) return;
    setIsRootDropActive(false);
    await handleDrop(e, null);
  };

  return (
    <div className="space-y-8">
      {/* Breadcrumbs */}
      {currentFolder && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentFolder(null)}
              className={`hover:text-foreground transition-all ${
                draggedProject && dragOverFolder === null
                  ? "ring-2 ring-blue-400 bg-blue-500/10 text-blue-400"
                  : ""
              }`}
              onDragOver={(e) => handleDragOver(e, null)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, null)}
            >
              <Home className="h-4 w-4 mr-1" />
              All Projects
              {draggedProject && dragOverFolder === null && (
                <span className="ml-2 text-xs">(Drop to move here)</span>
              )}
            </Button>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium">
              {currentFolderName}
            </span>
          </div>
          <div
            data-root-drop-zone
            className={`flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-3 text-sm transition-all duration-200 ${
              draggedProject
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-2 pointer-events-none"
            } ${
              isRootDropActive
                ? "border-blue-400 bg-blue-500/10 text-blue-300 shadow-lg shadow-blue-500/30"
                : "border-white/[0.12] bg-white/[0.03] text-white/70"
            }`}
            onDragOver={handleRootDragOver}
            onDragLeave={handleRootDragLeave}
            onDrop={handleRootDrop}
          >
            <Home className="h-4 w-4" />
            <span>Drop here to move this project out of the folder</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">
            {currentFolder ? currentFolderName : "Your Projects"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {currentFolder
              ? "Projects in this folder"
              : "Manage your design projects and continue where you left off."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/${(user as any)?.slug || user?.name}/trash`}
            className="flex items-center gap-2 backdrop-blur-xl bg-white/[0.05] border border-white/[0.12] saturate-150 hover:bg-white/[0.08] text-white/70 hover:text-white rounded-full px-4 py-2 text-sm transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Trash
          </Link>
          <Button
            onClick={() => setIsCreatingFolder(true)}
            className="backdrop-blur-xl bg-white/[0.08] border border-white/[0.12] saturate-150 hover:bg-white/[0.12] text-white rounded-full px-6"
          >
            <FolderPlus className="mr-2 h-4 w-4" />
            Create New Folder
          </Button>
        </div>
      </div>
      {/* Folders section - only show in root view */}
      {!currentFolder && folders.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">
            Folders
            {draggedProject && (
              <span className="ml-3 text-sm text-blue-400 animate-pulse">
                Drop project into a folder
              </span>
            )}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {folders.map((folder) => (
              <div
                key={folder._id}
                className={`group relative p-4 rounded-lg backdrop-blur-xl border transition-all duration-200 saturate-150 shadow-lg cursor-pointer ${
                  dragOverFolder === folder._id
                    ? "bg-blue-500/20 border-blue-400 scale-105 ring-2 ring-blue-400/50"
                    : "bg-white/[0.05] border-white/[0.12] hover:bg-white/[0.08]"
                }`}
                onClick={() => !draggedProject && setCurrentFolder(folder._id)}
                onDragOver={(e) => handleDragOver(e, folder._id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, folder._id)}
              >
                <div className="flex flex-col items-center gap-2 text-center">
                  <Folder
                    className={`w-10 h-10 transition-all ${
                      dragOverFolder === folder._id
                        ? "text-blue-400 scale-110"
                        : "text-white/70"
                    }`}
                  />
                  {editingFolderId === folder._id ? (
                    <Input
                      value={editingFolderName}
                      onChange={(e) => setEditingFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          saveFolderRename(folder._id);
                        } else if (e.key === "Escape") {
                          cancelEditingFolder();
                        }
                      }}
                      onBlur={cancelEditingFolder}
                      autoFocus
                      className="h-7 text-sm font-medium bg-background border-primary"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <h3
                      className="text-sm font-medium text-foreground truncate w-full cursor-text hover:text-primary transition-colors"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        startEditingFolder(folder._id, folder.name);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {folder.name}
                    </h3>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {getProjectCount(folder._id)} project
                    {getProjectCount(folder._id) !== 1 ? "s" : ""}
                  </p>
                </div>
                {!draggedProject && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 rounded-full"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent folder navigation when deleting
                      if (
                        confirm(
                          `Move folder "${folder.name}" to trash? Projects in this folder will also be moved to trash. You can restore them within 90 days.`
                        )
                      ) {
                        handleDeleteFolder(folder._id);
                      }
                    }}
                  >
                    <Trash2 className="h-3 w-3 text-red-400" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!projects || projects.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-muted flex items-center justify-center">
            {currentFolder ? (
              <Folder className="w-8 h-8 text-muted-foreground" />
            ) : (
              <Plus className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            {currentFolder ? "No projects in this folder" : "No projects yet"}
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            {currentFolder
              ? "Move projects here or create new ones"
              : "Create your first project to get started"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Projects</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {projects.map((project: any) => (
              <ProjectContextMenu
                key={project._id}
                projectId={project._id}
                projectName={project.name}
                folders={folders}
                onDelete={() => handleDeleteClick(project._id, project.name)}
                onRename={() => startEditing(project._id, project.name)}
                onMoveToFolder={(folderId) =>
                  handleMoveProject(project._id, folderId)
                }
                onCreateFolder={() => setIsCreatingFolder(true)}
              >
                <div
                  className={`group relative transition-all duration-200 ${
                    draggedProject === project._id
                      ? "opacity-50 scale-95 ring-2 ring-blue-400 rounded-lg"
                      : "hover:scale-[1.02]"
                  }`}
                  draggable={!editingProject}
                  onDragStart={() => handleDragStart(project._id)}
                  onDragEnd={handleDragEnd}
                >
                  {/* Drag indicator */}
                  {!draggedProject && !editingProject && (
                    <div className="absolute -top-1 -left-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-blue-500/90 rounded-full p-1">
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 8h16M4 16h16"
                        />
                      </svg>
                    </div>
                  )}
                  <Link
                    href={`/dashboard/${(user as any)?.slug || user?.name}/canvas?project=${project._id}`}
                    className="block cursor-pointer"
                    onClick={(e) => {
                      if (draggedProject) e.preventDefault();
                    }}
                  >
                    <div className="space-y-3">
                      <div className="aspect-[4/3] rounded-lg overflow-hidden bg-muted relative">
                        {project.thumbnail ? (
                          <Image
                            src={project.thumbnail}
                            alt={project.name}
                            width={300}
                            height={200}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                            <Plus className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        {editingProject === project._id ? (
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                saveRename(project._id);
                              } else if (e.key === "Escape") {
                                cancelEditing();
                              }
                            }}
                            onBlur={() => cancelEditing()}
                            autoFocus
                            className="h-6 text-sm font-medium bg-background border-primary"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <h3
                            className="font-medium text-foreground text-sm truncate group-hover:text-primary transition-colors cursor-text"
                            onDoubleClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              startEditing(project._id, project.name);
                            }}
                          >
                            {project.name}
                          </h3>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(project.lastModified), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  </Link>

                  {/* Three-dot menu button */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 backdrop-blur-sm"
                        onClick={(e) => e.preventDefault()}
                      >
                        <MoreVertical className="h-4 w-4 text-white" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="w-56 backdrop-blur-xl bg-black/90 border border-white/[0.12]"
                      align="end"
                    >
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.preventDefault();
                          startEditing(project._id, project.name);
                        }}
                        className="text-white cursor-pointer"
                      >
                        <Edit2 className="mr-2 h-4 w-4" />
                        <span>Rename</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/[0.12]" />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.preventDefault();
                          handleDeleteClick(project._id, project.name);
                        }}
                        className="text-red-400 cursor-pointer hover:text-red-300 focus:text-red-300"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Delete project</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </ProjectContextMenu>
            ))}
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!projectToDelete}
        onOpenChange={() => setProjectToDelete(null)}
      >
        <AlertDialogContent className="backdrop-blur-xl bg-black/90 border border-white/[0.12]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Move project to trash?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              &quot;{projectToDelete?.name}&quot; will be moved to trash. You
              can restore it within 90 days, after which it will be permanently
              deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="backdrop-blur-xl bg-white/[0.08] border border-white/[0.12] text-white hover:bg-white/[0.12] rounded-full">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="backdrop-blur-xl bg-red-500/80 hover:bg-red-500 text-white border border-red-400/50 rounded-full"
            >
              Move to Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create folder dialog */}
      <Dialog open={isCreatingFolder} onOpenChange={setIsCreatingFolder}>
        <DialogContent className="backdrop-blur-xl bg-black/90 border border-white/[0.12]">
          <DialogHeader>
            <DialogTitle className="text-white">Create New Folder</DialogTitle>
            <DialogDescription className="text-white/70">
              Give your folder a name to organize your projects.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="folder-name" className="text-white">
                Folder name
              </Label>
              <Input
                id="folder-name"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="My new folder"
                className="bg-white/[0.05] border-white/[0.12] text-white placeholder:text-white/50"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateFolder();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setIsCreatingFolder(false);
                setFolderName("");
              }}
              className="backdrop-blur-xl bg-white/[0.08] border border-white/[0.12] text-white hover:bg-white/[0.12] rounded-full"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateFolder}
              className="backdrop-blur-xl bg-white/[0.12] border border-white/[0.16] text-white hover:bg-white/[0.16] rounded-full saturate-150"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
