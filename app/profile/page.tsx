"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/animate-ui/components/radix/sidebar";
import { API_ENDPOINTS, getAuthHeaders } from "@/lib/api";

type ProfileData = {
  id: number;
  email: string;
  mobile_number: string;
  is_active: number;
  roles: string[];
};

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const { isAuthenticated, token } = useAuth();
  const router = useRouter();

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push("/login");
    }
  }, [mounted, isAuthenticated, router]);

  useEffect(() => {
    if (mounted && isAuthenticated && token) {
      fetchProfile();
    }
  }, [mounted, isAuthenticated, token]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError("");
      const authToken = localStorage.getItem("auth_token");

      const response = await fetch(API_ENDPOINTS.AUTH.PROFILE, {
        method: "GET",
        headers: getAuthHeaders(authToken),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to fetch profile");
      }

      setProfileData(data.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load profile data"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");
    setIsChangingPassword(true);

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All fields are required");
      setIsChangingPassword(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirm password do not match");
      setIsChangingPassword(false);
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long");
      setIsChangingPassword(false);
      return;
    }

    try {
      const authToken = localStorage.getItem("auth_token");

      const response = await fetch(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
        method: "POST",
        headers: getAuthHeaders(authToken),
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        // Handle validation errors
        if (
          data.errors &&
          Array.isArray(data.errors) &&
          data.errors.length > 0
        ) {
          const errorMessages = data.errors
            .map((err: { message: string }) => err.message)
            .join(", ");
          setPasswordError(errorMessages);
        } else {
          setPasswordError(data.message || "Failed to change password");
        }
      } else {
        setPasswordSuccess("Password changed successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      setPasswordError(
        err instanceof Error
          ? err.message
          : "An error occurred. Please try again."
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!mounted || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <h1 className="text-2xl font-bold">Profile</h1>
                <p className="text-muted-foreground mt-2">
                  Manage your profile and account settings
                </p>
              </div>

              <div className="px-4 lg:px-6">
                <Tabs defaultValue="profile" className="w-full">
                  <TabsList>
                    <TabsTrigger value="profile">
                      Profile Information
                    </TabsTrigger>
                    <TabsTrigger value="password">Change Password</TabsTrigger>
                  </TabsList>

                  <TabsContent value="profile" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Profile Information</CardTitle>
                        <CardDescription>
                          View your account details
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {loading ? (
                          <div className="text-center py-8">
                            <p className="text-muted-foreground">Loading...</p>
                          </div>
                        ) : error ? (
                          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                            {error}
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2"
                              onClick={fetchProfile}
                            >
                              Retry
                            </Button>
                          </div>
                        ) : profileData ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label className="text-muted-foreground">
                                  User ID
                                </Label>
                                <p className="text-sm font-medium mt-1">
                                  {profileData.id}
                                </p>
                              </div>
                              <div>
                                <Label className="text-muted-foreground">
                                  Email
                                </Label>
                                <p className="text-sm font-medium mt-1">
                                  {profileData.email}
                                </p>
                              </div>
                              <div>
                                <Label className="text-muted-foreground">
                                  Mobile Number
                                </Label>
                                <p className="text-sm font-medium mt-1">
                                  {profileData.mobile_number}
                                </p>
                              </div>
                              <div>
                                <Label className="text-muted-foreground">
                                  Status
                                </Label>
                                <div className="mt-1">
                                  <Badge
                                    variant={
                                      profileData.is_active === 1
                                        ? "default"
                                        : "secondary"
                                    }
                                  >
                                    {profileData.is_active === 1
                                      ? "Active"
                                      : "Inactive"}
                                  </Badge>
                                </div>
                              </div>
                              <div className="md:col-span-2">
                                <Label className="text-muted-foreground">
                                  Roles
                                </Label>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {profileData.roles.map((role, index) => (
                                    <Badge key={index} variant="outline">
                                      {role}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="password" className="mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Change Password</CardTitle>
                        <CardDescription>
                          Update your password to keep your account secure
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <form onSubmit={handleChangePassword}>
                          <div className="space-y-4">
                            {passwordError && (
                              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                                {passwordError}
                              </div>
                            )}
                            {passwordSuccess && (
                              <div className="rounded-md bg-green-500/15 p-3 text-sm text-green-600 dark:text-green-400">
                                {passwordSuccess}
                              </div>
                            )}
                            <div className="space-y-2">
                              <Label htmlFor="current_password">
                                Current Password
                              </Label>
                              <Input
                                id="current_password"
                                type="password"
                                placeholder="Enter your current password"
                                value={currentPassword}
                                onChange={(e) =>
                                  setCurrentPassword(e.target.value)
                                }
                                required
                                disabled={isChangingPassword}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="new_password">New Password</Label>
                              <Input
                                id="new_password"
                                type="password"
                                placeholder="Enter your new password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                disabled={isChangingPassword}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="confirm_password">
                                Confirm New Password
                              </Label>
                              <Input
                                id="confirm_password"
                                type="password"
                                placeholder="Confirm your new password"
                                value={confirmPassword}
                                onChange={(e) =>
                                  setConfirmPassword(e.target.value)
                                }
                                required
                                disabled={isChangingPassword}
                              />
                            </div>
                            <Button
                              type="submit"
                              disabled={isChangingPassword}
                              className="w-full"
                            >
                              {isChangingPassword
                                ? "Changing Password..."
                                : "Change Password"}
                            </Button>
                          </div>
                        </form>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
