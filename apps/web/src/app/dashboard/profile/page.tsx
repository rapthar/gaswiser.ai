'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase'; // used only for password change
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';
import { HiOutlineUser, HiOutlineEnvelope, HiOutlineShieldCheck, HiOutlineArrowUpTray, HiOutlineAtSymbol, HiOutlineCamera, HiOutlineArrowPath } from 'react-icons/hi2';
import { cn } from '@/lib/utils';

// ── Avatar upload drop-zone ───────────────────────────────────────────────────
interface AvatarUploadProps {
  currentUrl: string | null;
  initials: string;
  onSaved: (url: string) => void;
}

function AvatarUpload({ currentUrl, initials, onSaved }: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreview(currentUrl);
  }, [currentUrl]);

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2 MB');
      return;
    }

    setPreview(URL.createObjectURL(file));
    setIsUploading(true);

    try {
      const { avatar_url } = await apiClient.uploadAvatar(file);
      onSaved(avatar_url);
      toast.success('Avatar updated!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
      setPreview(currentUrl);
    } finally {
      setIsUploading(false);
    }
  }, [currentUrl, onSaved]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Drop zone */}
      <div
        className={cn(
          'relative group cursor-pointer select-none rounded-full transition-all duration-150',
          isDragging && 'ring-2 ring-primary ring-offset-2',
        )}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
      >
        {/* Avatar circle */}
        <div className="h-24 w-24 rounded-full overflow-hidden bg-[#0060A9] flex items-center justify-center text-white text-2xl font-bold shrink-0">
          {preview ? (
            <img src={preview} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </div>

        {/* Hover overlay */}
        <div className={cn(
          'absolute inset-0 rounded-full flex items-center justify-center bg-black/50 transition-opacity duration-150',
          isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        )}>
          {isUploading
            ? <HiOutlineArrowPath className="h-6 w-6 text-white animate-spin" />
            : <HiOutlineCamera className="h-6 w-6 text-white" />
          }
        </div>
      </div>

      {/* Drop hint */}
      <div
        className={cn(
          'flex items-center gap-2 border-2 border-dashed rounded-xl px-4 py-2.5 text-sm text-muted-foreground transition-colors cursor-pointer hover:border-primary hover:text-primary',
          isDragging ? 'border-primary text-primary bg-primary/5' : 'border-border',
        )}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
      >
        <HiOutlineArrowUpTray className="h-4 w-4 shrink-0" />
        <span>
          {isDragging ? 'Drop to upload' : 'Drag & drop or click to upload'}
        </span>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">JPEG, PNG, WebP or GIF · max 2 MB</p>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={onInputChange}
      />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => apiClient.getProfile(),
  });

  const profile = data?.profile;

  const [fullName, setFullName]   = useState('');
  const [username, setUsername]   = useState('');
  const [newPassword, setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? '');
    setUsername(profile.username ?? '');
    setAvatarUrl(profile.avatar_url ?? null);
  }, [profile]);

  const usernameError = username && !/^[a-zA-Z][a-zA-Z0-9_]{2,29}$/.test(username)
    ? 'Must be 3-30 chars, start with a letter, letters/numbers/underscores only'
    : null;

  const profileMutation = useMutation({
    mutationFn: () => apiClient.updateProfile({
      ...(fullName.trim() ? { full_name: fullName.trim() } : {}),
      ...(username.trim() && !usernameError ? { username: username.trim() } : {}),
    }),
    onSuccess: () => {
      toast.success('Profile updated!');
      qc.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const passwordMutation = useMutation({
    mutationFn: async () => {
      if (!newPassword) throw new Error('New password is required');
      if (newPassword !== confirmPassword) throw new Error('Passwords do not match');
      if (newPassword.length < 8) throw new Error('Password must be at least 8 characters');
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success('Password changed!');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : '??';
  const displayName = profile?.full_name || profile?.username || user?.email?.split('@')[0] || 'Account';

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account details and security.</p>
      </div>

      {/* Avatar card */}
      <Card>
        <CardHeader>
          <CardTitle>
            <HiOutlineCamera className="h-4 w-4" />
            Profile Picture
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AvatarUpload
            currentUrl={avatarUrl}
            initials={initials}
            onSaved={(url) => {
              setAvatarUrl(url);
              qc.invalidateQueries({ queryKey: ['profile'] });
            }}
          />
        </CardContent>
      </Card>

      {/* Personal info */}
      <Card>
        <CardHeader>
          <CardTitle>
            <HiOutlineUser className="h-4 w-4" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Username */}
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <HiOutlineAtSymbol className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                id="username"
                placeholder="your_handle"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                className="pl-8"
                disabled={isLoading}
              />
            </div>
            {usernameError && (
              <p className="text-xs text-destructive">{usernameError}</p>
            )}
          </div>

          {/* Full name */}
          <div className="space-y-1.5">
            <Label htmlFor="full-name">Full Name</Label>
            <Input
              id="full-name"
              placeholder="Your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Email (read-only) */}
          <div className="space-y-1.5">
            <Label>Email</Label>
            <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-secondary text-sm text-muted-foreground">
              <HiOutlineEnvelope className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{user?.email ?? ''}</span>
            </div>
            <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
          </div>

          <Button
            onClick={() => profileMutation.mutate()}
            disabled={profileMutation.isPending || !!usernameError || (!fullName.trim() && !username.trim())}
            loading={profileMutation.isPending}
            className="w-full"
          >
            {profileMutation.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle>
            <HiOutlineShieldCheck className="h-4 w-4" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Repeat new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-destructive">Passwords do not match</p>
            )}
          </div>
          <Button
            onClick={() => passwordMutation.mutate()}
            disabled={passwordMutation.isPending || !newPassword || !confirmPassword || newPassword !== confirmPassword}
            loading={passwordMutation.isPending}
            variant="outline"
            className="w-full"
          >
            {passwordMutation.isPending ? 'Updating…' : 'Update Password'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
