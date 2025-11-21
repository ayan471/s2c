"use client";
import {
  CircleQuestionMark,
  Hash,
  LayoutTemplate,
  User,
  CreditCard,
  LogOut,
} from "lucide-react";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useAppSelector } from "@/redux/store";
import { CreateProject } from "../buttons/project";
import { Autosave } from "../canvas/autosave";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "../ui/input";
import { toast } from "sonner";

type TabProps = {
  label: string;
  href: string;
  icon?: React.ReactNode;
};

export const Navbar = () => {
  const params = useSearchParams();
  const projectId = params.get("project");
  const me = useAppSelector((state) => state.profile);
  const { handleSignOut } = useAuth();
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const renameProjectMutation = useMutation(api.projects.renameProject);

  const tabs: TabProps[] = [
    {
      label: "Canvas",
      href: `/dashboard/${me.slug || me.name}/canvas?project=${projectId}`,
      icon: <Hash className="h-4 w-4" />,
    },
    {
      label: "Style Guide",
      href: `/dashboard/${me.slug || me.name}/style-guide?project=${projectId}`,
      icon: <LayoutTemplate className="h-4 w-4" />,
    },
  ];

  const pathname = usePathname();
  const { image } = useAppSelector((state) => state.profile);
  const project = useQuery(
    api.projects.getProject,
    projectId ? { projectId: projectId as Id<"projects"> } : "skip"
  );

  const creditBalance = useQuery(api.credits.getCreditsBalance, {
    userId: me.id as Id<"users">,
  });

  const hasCanvas = pathname.includes("canvas");
  const hasStyleGuide = pathname.includes("style-guide");

  const startEditingProjectName = () => {
    if (project?.name) {
      setEditedName(project.name);
      setIsEditingProjectName(true);
    }
  };

  const cancelEditingProjectName = () => {
    setIsEditingProjectName(false);
    setEditedName("");
  };

  const saveProjectName = async () => {
    if (!projectId) {
      cancelEditingProjectName();
      return;
    }

    if (!editedName.trim()) {
      toast.error("Project name cannot be empty");
      cancelEditingProjectName();
      return;
    }

    // Don't save if name hasn't changed
    if (editedName.trim() === project?.name) {
      cancelEditingProjectName();
      return;
    }

    try {
      await renameProjectMutation({
        projectId: projectId as Id<"projects">,
        newName: editedName.trim(),
      });
      toast.success("Project renamed!");
      cancelEditingProjectName();
    } catch (error) {
      console.error("Error renaming project:", error);
      toast.error("Could not rename project");
      cancelEditingProjectName();
    }
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 p-6 fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/${me.slug || me.name}`}
          className="w-8 h-8 rounded-full border-3 border-white bg-black flex items-center justify-center"
        >
          <div className="w-4 h-4 rounded-full bg-white"></div>
        </Link>
        {!hasCanvas ||
          (!hasStyleGuide && (
            <div className="lg:inline-flex hidden items-center gap-2 rounded-full text-primary/60 border border-white/[0.12] backdrop-blur-xl bg-white/[0.08] px-4 py-2 text-sm saturate-150">
              <span className="text-white/50">Project /</span>
              {isEditingProjectName ? (
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      saveProjectName();
                    } else if (e.key === "Escape") {
                      cancelEditingProjectName();
                    }
                  }}
                  onBlur={() => saveProjectName()}
                  autoFocus
                  className="h-6 px-2 text-sm bg-white/[0.12] border-white/[0.2] text-white w-32"
                />
              ) : (
                <span
                  className="cursor-pointer hover:text-white transition-colors"
                  onDoubleClick={startEditingProjectName}
                  title="Double-click to rename"
                >
                  {project?.name}
                </span>
              )}
            </div>
          ))}
      </div>
      <div className="lg:flex hidden items-center justify-center gap-2">
        <div className="flex items-center gap-2 backdrop-blur-xl bg-white/[0.08] border border-white/[0.12] rounded-full p-2 saturate-150">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={[
                "group inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition",
                `${pathname}?project=${projectId}` === t.href
                  ? "bg-white/[0.12] text-white border border-white/[0.16] backdrop-blur-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] border border-transparent",
              ].join(" ")}
            >
              <span
                className={
                  `${pathname}?project=${projectId}` === t.href
                    ? "opacity-100"
                    : "opacity-70 group-hover:opacity-90"
                }
              >
                {t.icon}
              </span>
              <span>{t.label}</span>
            </Link>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4 justify-end">
        <span className="text-sm text-white/50">{creditBalance} credits</span>
        <Button
          variant="secondary"
          className="rounded-full h-12 w-12 flex items-center justify-center backdrop-blur-xl bg-white/[0.08] border border-white/[0.12] saturate-150 hover:bg-white/[0.12]"
        >
          <CircleQuestionMark className="size-5 text-white" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-12 w-12 rounded-full p-0 hover:bg-white/[0.05] transition-colors"
            >
              <Avatar className="size-12 cursor-pointer">
                <AvatarImage src={image} />
                <AvatarFallback>
                  <User className="size-5 text-black" />
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56 backdrop-blur-xl bg-black/90 border border-white/[0.12]"
            align="end"
          >
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium text-white">{me.name}</p>
                <p className="text-xs text-white/50">{me.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/[0.12]" />
            <DropdownMenuItem asChild>
              <Link
                href="/profile"
                className="cursor-pointer text-white hover:text-white"
              >
                <User className="mr-2 h-4 w-4" />
                <span>Profile Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href={`/billing/${me.slug || me.name}`}
                className="cursor-pointer text-white hover:text-white"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                <span>Billing & Credits</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/[0.12]" />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="cursor-pointer text-red-400 hover:text-red-300 focus:text-red-300"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {hasCanvas && <Autosave />}
        {!hasCanvas && !hasStyleGuide && <CreateProject />}
      </div>
    </div>
  );
};
