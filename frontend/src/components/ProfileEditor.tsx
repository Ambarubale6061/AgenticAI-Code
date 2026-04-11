// src/components/ProfileEditor.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { User } from "lucide-react";

interface ProfileEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileEditor({ open, onOpenChange }: ProfileEditorProps) {
  const { user, updateProfile } = useAuth();
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || "");
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error("Please enter a name");
      return;
    }
    setIsLoading(true);
    const { error } = await updateProfile(fullName.trim());
    setIsLoading(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success("Profile updated");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Edit Profile
          </DialogTitle>
          <DialogDescription>
            Update your display name used in the chat.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              placeholder="Enter your name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}