"use client";

import { useState, useCallback, type KeyboardEvent, useEffect } from "react";
import { useMutation } from "@apollo/client/react";
import { Loader2, Plus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CREATE_TRIBE, ADD_OPEN_ROLE } from "@/lib/graphql/mutations/tribes";

interface OpenRole {
  title: string;
  skills: string[];
}

interface CreateTribeData {
  tribes: {
    createTribe: {
      id: string;
      name: string;
      mission: string | null;
      status: string;
      maxMembers: number;
    };
  };
}

interface AddOpenRoleData {
  tribes: {
    addOpenRole: {
      id: string;
      title: string;
      skillsNeeded: string[];
      filled: boolean;
    };
  };
}

interface CreateTribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (tribeId: string) => void;
}

const DEFAULT_MAX_MEMBERS = 5;

export function CreateTribeModal({
  isOpen,
  onClose,
  onCreated,
}: CreateTribeModalProps) {
  const [name, setName] = useState("");
  const [mission, setMission] = useState("");
  const [maxMembers, setMaxMembers] = useState(DEFAULT_MAX_MEMBERS);
  const [roles, setRoles] = useState<OpenRole[]>([]);
  const [nameError, setNameError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [createTribe] = useMutation<CreateTribeData>(CREATE_TRIBE);
  const [addOpenRole] = useMutation<AddOpenRoleData>(ADD_OPEN_ROLE);

  const resetForm = useCallback(() => {
    setName("");
    setMission("");
    setMaxMembers(DEFAULT_MAX_MEMBERS);
    setRoles([]);
    setNameError("");
    setIsSubmitting(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  const handleAddRole = () => {
    setRoles((prev) => [...prev, { title: "", skills: [] }]);
  };

  const handleRemoveRole = (index: number) => {
    setRoles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRoleTitleChange = (index: number, title: string) => {
    setRoles((prev) => prev.map((r, i) => (i === index ? { ...r, title } : r)));
  };

  const handleAddSkill = (roleIndex: number, skill: string) => {
    const trimmed = skill.trim();
    if (!trimmed) return;
    setRoles((prev) =>
      prev.map((r, i) =>
        i === roleIndex && !r.skills.includes(trimmed)
          ? { ...r, skills: [...r.skills, trimmed] }
          : r
      )
    );
  };

  const handleRemoveSkill = (roleIndex: number, skillIndex: number) => {
    setRoles((prev) =>
      prev.map((r, i) =>
        i === roleIndex
          ? { ...r, skills: r.skills.filter((_, si) => si !== skillIndex) }
          : r
      )
    );
  };

  const handleSkillKeyDown = (
    roleIndex: number,
    e: KeyboardEvent<HTMLInputElement>
  ) => {
    const value = e.currentTarget.value;
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSkill(roleIndex, value);
      e.currentTarget.value = "";
    } else if (e.key === ",") {
      // Handled in onChange via comma detection
    }
  };

  const handleSkillInput = (
    roleIndex: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    if (value.endsWith(",")) {
      const skill = value.slice(0, -1);
      handleAddSkill(roleIndex, skill);
      e.target.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setNameError("Tribe name is required");
      return;
    }
    setNameError("");
    setIsSubmitting(true);

    try {
      const result = await createTribe({
        variables: {
          name: name.trim(),
          mission: mission.trim() || undefined,
          maxMembers,
        },
      });

      const tribeId = result.data?.tribes?.createTribe?.id;
      if (!tribeId) throw new Error("Failed to create tribe");

      // Add each open role
      const rolesToAdd = roles.filter((r) => r.title.trim());
      for (const role of rolesToAdd) {
        await addOpenRole({
          variables: {
            tribeId,
            title: role.title.trim(),
            skillsNeeded: role.skills.length > 0 ? role.skills : undefined,
          },
        });
      }

      onCreated?.(tribeId);
      onClose();
    } catch {
      // API error handling — for V1 we keep it simple
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-[600px] bg-surface-elevated"
        showCloseButton={false}
      >
        <DialogHeader>
          <p className="text-xs font-semibold tracking-widest uppercase text-accent">
            CREATE TRIBE
          </p>
          <DialogTitle className="font-serif text-2xl text-ink font-normal">
            Form your team
          </DialogTitle>
          <DialogDescription className="sr-only">
            Create a new tribe with name, mission, and open roles
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Tribe Name */}
          <div className="space-y-1.5">
            <label
              htmlFor="tribe-name"
              className="text-xs font-medium tracking-wider uppercase text-ink-tertiary"
            >
              Tribe Name <span className="text-error">*</span>
            </label>
            <Input
              id="tribe-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError("");
              }}
              aria-invalid={!!nameError}
            />
            {nameError && (
              <p className="text-sm text-error">{nameError}</p>
            )}
          </div>

          {/* Mission */}
          <div className="space-y-1.5">
            <label
              htmlFor="tribe-mission"
              className="text-xs font-medium tracking-wider uppercase text-ink-tertiary"
            >
              Mission
            </label>
            <textarea
              id="tribe-mission"
              value={mission}
              onChange={(e) => setMission(e.target.value)}
              placeholder="What are you building and why?"
              rows={3}
              className="w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm"
            />
          </div>

          {/* Max Members */}
          <div className="space-y-1.5">
            <label
              htmlFor="tribe-max-members"
              className="text-xs font-medium tracking-wider uppercase text-ink-tertiary"
            >
              Max Members
            </label>
            <Input
              id="tribe-max-members"
              type="number"
              min="1"
              value={maxMembers}
              onChange={(e) =>
                setMaxMembers(Math.max(1, parseInt(e.target.value) || 1))
              }
              className="w-32"
            />
          </div>

          {/* Divider */}
          <div className="border-t border-dashed border-surface-secondary" />

          {/* Open Roles */}
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium tracking-wider uppercase text-ink-tertiary">
                Open Roles
              </p>
              <p className="text-sm text-ink-secondary">
                Add the roles you&apos;re looking for:
              </p>
            </div>

            {roles.map((role, roleIndex) => (
              <div
                key={roleIndex}
                data-testid={`role-card-${roleIndex}`}
                className="bg-surface-secondary rounded-md p-4 space-y-3"
              >
                <div className="space-y-1.5">
                  <label
                    htmlFor={`role-title-${roleIndex}`}
                    className="text-xs font-medium tracking-wider uppercase text-ink-tertiary"
                  >
                    Title
                  </label>
                  <Input
                    id={`role-title-${roleIndex}`}
                    value={role.title}
                    onChange={(e) =>
                      handleRoleTitleChange(roleIndex, e.target.value)
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor={`role-skills-${roleIndex}`}
                    className="text-xs font-medium tracking-wider uppercase text-ink-tertiary"
                  >
                    Skills
                  </label>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {role.skills.map((skill, skillIndex) => (
                      <span
                        key={skillIndex}
                        className="inline-flex items-center gap-1 rounded-md bg-accent-subtle px-2 py-0.5 font-mono text-xs text-accent"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() =>
                            handleRemoveSkill(roleIndex, skillIndex)
                          }
                          className="hover:text-accent-hover"
                          aria-label={`Remove ${skill}`}
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <Input
                    id={`role-skills-${roleIndex}`}
                    placeholder="Type a skill, press Enter"
                    onKeyDown={(e) => handleSkillKeyDown(roleIndex, e)}
                    onChange={(e) => handleSkillInput(roleIndex, e)}
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-error hover:text-error"
                    onClick={() => handleRemoveRole(roleIndex)}
                  >
                    Remove Role
                  </Button>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="ghost"
              className="text-accent hover:text-accent-hover"
              onClick={handleAddRole}
            >
              <Plus className="size-4" />
              Add another role
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-accent text-white hover:bg-accent-hover"
          >
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            Create Tribe
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
