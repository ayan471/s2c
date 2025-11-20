import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

export const useFolders = (userId: Id<"users">, includeDeleted = false) => {
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [folderName, setFolderName] = useState("");

  const folders = useQuery(api.folders.getUserFolders, {
    userId,
    includeDeleted,
  });
  const createFolderMutation = useMutation(api.folders.createFolder);
  const deleteFolderMutation = useMutation(api.folders.deleteFolder);
  const renameFolderMutation = useMutation(api.folders.renameFolder);
  const restoreFolderMutation = useMutation(api.folders.restoreFolder);
  const permanentlyDeleteFolderMutation = useMutation(
    api.folders.permanentlyDeleteFolder
  );
  const moveProjectMutation = useMutation(api.folders.moveProjectToFolder);
  const deleteProjectMutation = useMutation(api.projects.deleteProject);
  const restoreProjectMutation = useMutation(api.projects.restoreProject);
  const permanentlyDeleteProjectMutation = useMutation(
    api.projects.permanentlyDeleteProject
  );
  const renameProjectMutation = useMutation(api.projects.renameProject);

  const handleCreateFolder = async () => {
    if (!folderName.trim()) {
      toast.error("Folder name cannot be empty");
      return;
    }

    try {
      await createFolderMutation({
        userId,
        name: folderName.trim(),
      });
      toast.success(`Folder "${folderName}" created!`);
      setFolderName("");
      setIsCreatingFolder(false);
    } catch (error) {
      console.error("Error creating folder:", error);
      toast.error("Could not create folder");
    }
  };

  const handleDeleteFolder = async (folderId: Id<"folders">) => {
    try {
      await deleteFolderMutation({ folderId });
      toast.success("Folder moved to trash!");
    } catch (error) {
      console.error("Error deleting folder:", error);
      toast.error("Could not delete folder");
    }
  };

  const handleRestoreFolder = async (folderId: Id<"folders">) => {
    try {
      await restoreFolderMutation({ folderId });
      toast.success("Folder restored!");
    } catch (error) {
      console.error("Error restoring folder:", error);
      toast.error("Could not restore folder");
    }
  };

  const handlePermanentlyDeleteFolder = async (folderId: Id<"folders">) => {
    try {
      await permanentlyDeleteFolderMutation({ folderId });
      toast.success("Folder permanently deleted!");
    } catch (error) {
      console.error("Error permanently deleting folder:", error);
      toast.error("Could not permanently delete folder");
    }
  };

  const handleRenameFolder = async (
    folderId: Id<"folders">,
    newName: string
  ) => {
    if (!newName.trim()) {
      toast.error("Folder name cannot be empty");
      return false;
    }

    try {
      await renameFolderMutation({ folderId, newName: newName.trim() });
      toast.success("Folder renamed!");
      return true;
    } catch (error) {
      console.error("Error renaming folder:", error);
      toast.error("Could not rename folder");
      return false;
    }
  };

  const handleMoveProject = async (
    projectId: Id<"projects">,
    folderId: Id<"folders"> | null
  ) => {
    try {
      await moveProjectMutation({
        projectId,
        folderId: folderId || undefined,
      });
      const folderName = folderId
        ? folders?.find((f) => f._id === folderId)?.name
        : "root";
      toast.success(`Project moved to ${folderName}!`);
    } catch (error) {
      console.error("Error moving project:", error);
      toast.error("Could not move project");
    }
  };

  const handleDeleteProject = async (projectId: Id<"projects">) => {
    try {
      await deleteProjectMutation({ projectId });
      toast.success("Project moved to trash!");
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("Could not delete project");
    }
  };

  const handleRestoreProject = async (projectId: Id<"projects">) => {
    try {
      await restoreProjectMutation({ projectId });
      toast.success("Project restored!");
    } catch (error) {
      console.error("Error restoring project:", error);
      toast.error("Could not restore project");
    }
  };

  const handlePermanentlyDeleteProject = async (projectId: Id<"projects">) => {
    try {
      await permanentlyDeleteProjectMutation({ projectId });
      toast.success("Project permanently deleted!");
    } catch (error) {
      console.error("Error permanently deleting project:", error);
      toast.error("Could not permanently delete project");
    }
  };

  const handleRenameProject = async (
    projectId: Id<"projects">,
    newName: string
  ) => {
    if (!newName.trim()) {
      toast.error("Project name cannot be empty");
      return false;
    }

    try {
      await renameProjectMutation({ projectId, newName: newName.trim() });
      toast.success("Project renamed!");
      return true;
    } catch (error) {
      console.error("Error renaming project:", error);
      toast.error("Could not rename project");
      return false;
    }
  };

  return {
    folders: folders || [],
    isCreatingFolder,
    folderName,
    setFolderName,
    setIsCreatingFolder,
    handleCreateFolder,
    handleDeleteFolder,
    handleRestoreFolder,
    handlePermanentlyDeleteFolder,
    handleMoveProject,
    handleDeleteProject,
    handleRestoreProject,
    handlePermanentlyDeleteProject,
    handleRenameProject,
    handleRenameFolder,
  };
};
