import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { User, Upload, Camera, Lock, Eye, EyeOff, Loader2 } from "lucide-react";

export function ProfileCard() {
  const { user, updateProfile, updateAvatar, updatePassword } = useAuth();
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || "");
  const [isEditingName, setIsEditingName] = useState(false);
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const avatarUrl = user?.user_metadata?.avatar_url;
  const initials = fullName
    ? fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() || "U";

  const handleUpdateName = async () => {
    if (!fullName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    setIsUpdatingName(true);
    const { error } = await updateProfile(fullName.trim());
    setIsUpdatingName(false);
    if (error) toast.error(error);
    else {
      toast.success("Name updated");
      setIsEditingName(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    setIsUpdatingAvatar(true);
    const { error } = await updateAvatar(file);
    setIsUpdatingAvatar(false);
    if (error) toast.error(error);
    else toast.success("Avatar updated");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setIsChangingPassword(true);
    const { error } = await updatePassword(currentPassword, newPassword);
    setIsChangingPassword(false);
    if (error) toast.error(error);
    else {
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Profile
        </CardTitle>
        <CardDescription>Manage your account details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 border-2 border-primary/20">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback className="text-lg bg-secondary">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUpdatingAvatar}
            >
              {isUpdatingAvatar ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Camera className="h-4 w-4 mr-2" />
              )}
              Change Avatar
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Name */}
        <div>
          <Label>Full Name</Label>
          {isEditingName ? (
            <div className="flex gap-2 mt-1">
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                autoFocus
              />
              <Button size="sm" onClick={handleUpdateName} disabled={isUpdatingName}>
                {isUpdatingName ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsEditingName(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex justify-between items-center mt-1">
              <span className="text-foreground font-medium">{fullName || "Not set"}</span>
              <Button variant="ghost" size="sm" onClick={() => setIsEditingName(true)}>
                Edit
              </Button>
            </div>
          )}
        </div>

        {/* Email */}
        <div>
          <Label>Email</Label>
          <div className="mt-1 text-muted-foreground">{user?.email}</div>
        </div>

        {/* Change Password */}
        <div className="pt-2 border-t">
          <Label className="flex items-center gap-2 mb-2">
            <Lock className="h-4 w-4" />
            Change Password
          </Label>
          <div className="space-y-3">
            <div className="relative">
              <Input
                type={showCurrent ? "text" : "password"}
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowCurrent(!showCurrent)}
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowNew(!showNew)}
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <Button
              onClick={handlePasswordChange}
              disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
              className="w-full"
            >
              {isChangingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Update Password
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}