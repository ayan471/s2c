"use client";

import React from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Trash2, FolderInput, FolderPlus, Edit2 } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";

interface ProjectContextMenuProps {
  children: React.ReactNode;
  projectId: Id<"projects">;
  projectName: string;
  folders: Array<{ _id: Id<"folders">; name: string }>;
  onDelete: () => void;
  onRename: () => void;
  onMoveToFolder: (folderId: Id<"folders"> | null) => void;
  onCreateFolder: () => void;
}

export const ProjectContextMenu = ({
  children,
  projectId,
  projectName,
  folders,
  onDelete,
  onRename,
  onMoveToFolder,
  onCreateFolder,
}: ProjectContextMenuProps) => {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56 backdrop-blur-xl bg-black/90 border border-white/[0.12]">
        <ContextMenuItem
          onClick={onRename}
          className="text-white cursor-pointer"
        >
          <Edit2 className="mr-2 h-4 w-4" />
          <span>Rename</span>
        </ContextMenuItem>
        <ContextMenuSeparator className="bg-white/[0.12]" />
        <ContextMenuSub>
          <ContextMenuSubTrigger className="text-white">
            <FolderInput className="mr-2 h-4 w-4" />
            <span>Move to folder</span>
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="backdrop-blur-xl bg-black/90 border border-white/[0.12]">
            <ContextMenuItem
              onClick={() => onMoveToFolder(null)}
              className="text-white cursor-pointer"
            >
              <span>📂 No folder (root)</span>
            </ContextMenuItem>
            <ContextMenuSeparator className="bg-white/[0.12]" />
            {folders.length === 0 ? (
              <ContextMenuItem disabled className="text-white/50">
                No folders
              </ContextMenuItem>
            ) : (
              folders.map((folder) => (
                <ContextMenuItem
                  key={folder._id}
                  onClick={() => onMoveToFolder(folder._id)}
                  className="text-white cursor-pointer"
                >
                  <span>📁 {folder.name}</span>
                </ContextMenuItem>
              ))
            )}
            <ContextMenuSeparator className="bg-white/[0.12]" />
            <ContextMenuItem
              onClick={onCreateFolder}
              className="text-blue-400 cursor-pointer"
            >
              <FolderPlus className="mr-2 h-4 w-4" />
              <span>Create new folder</span>
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator className="bg-white/[0.12]" />
        <ContextMenuItem
          onClick={onDelete}
          className="text-red-400 cursor-pointer hover:text-red-300 focus:text-red-300"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          <span>Delete project</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
