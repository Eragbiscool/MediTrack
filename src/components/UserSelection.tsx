import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createUserLocal, getUsersLocal } from "@/data/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Pill, Plus, UserCircle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface User {
  id: string;
  name: string;
  date_of_birth: string;
}

interface UserSelectionProps {
  onUserSelect: (userId: string, userName: string) => void;
}

export function UserSelection({ onUserSelect }: UserSelectionProps) {
  const [showNewUser, setShowNewUser] = useState(false);
  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [verifyDob, setVerifyDob] = useState("");
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      return (await getUsersLocal()) as User[];
    },
  });

  const createUser = useMutation({
    mutationFn: async (newUser: { name: string; date_of_birth: string }) => {
      return await createUserLocal(newUser);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Profile created successfully!");
      onUserSelect(data.id, data.name);
    },
    onError: () => {
      toast.error("Failed to create profile");
    },
  });

  const verifyUser = useMutation({
    mutationFn: async ({ user, dob }: { user: User; dob: string }) => {
      if (user.date_of_birth !== dob) {
        throw new Error("Incorrect date of birth");
      }
      return user;
    },
    onSuccess: (user) => {
      toast.success("Access granted!");
      setShowVerifyDialog(false);
      onUserSelect(user.id, user.name);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Verification failed");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !dateOfBirth) {
      toast.error("Please fill in all fields");
      return;
    }
    createUser.mutate({ name, date_of_birth: dateOfBirth });
  };

  const handleUserClick = (user: User) => {
    setSelectedUser(user);
    setVerifyDob("");
    setShowVerifyDialog(true);
  };

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !verifyDob) {
      toast.error("Please enter date of birth");
      return;
    }
    verifyUser.mutate({ user: selectedUser, dob: verifyDob });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-[var(--shadow-card)]">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-primary/70 rounded-2xl flex items-center justify-center mb-2">
            <Pill className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            MediTrack
          </CardTitle>
          <CardDescription className="text-base">
            Your personal medicine reminder companion
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!showNewUser ? (
            <>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading users...</div>
              ) : users && users.length > 0 ? (
                <>
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Select Your Profile</Label>
                    <div className="grid gap-3">
                      {users.map((user) => (
                        <Button
                          key={user.id}
                          variant="outline"
                          className="h-auto p-4 justify-start hover:border-primary hover:bg-primary/5 transition-all group"
                          onClick={() => handleUserClick(user)}
                        >
                          <UserCircle className="w-6 h-6 mr-3 text-primary" />
                          <div className="text-left">
                            <div className="font-semibold transition-colors duration-200 ease-in-out group-hover:text-primary">
                              {user.name}
                            </div>
                            {/* Date of birth intentionally hidden here for privacy/verification purposes */}
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">or</span>
                    </div>
                  </div>
                </>
              ) : null}
              
              <Button
                onClick={() => setShowNewUser(true)}
                className="w-full"
                size="lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create New Profile
              </Button>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewUser(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={createUser.isPending}>
                  {createUser.isPending ? "Creating..." : "Create Profile"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Date of Birth Verification Dialog */}
      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Identity</DialogTitle>
            <DialogDescription>
              Please enter your date of birth to access {selectedUser?.name}'s profile
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleVerifySubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="verify-dob">Date of Birth</Label>
              <Input
                id="verify-dob"
                type="date"
                value={verifyDob}
                onChange={(e) => setVerifyDob(e.target.value)}
                required
              />
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowVerifyDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={verifyUser.isPending}>
                {verifyUser.isPending ? "Verifying..." : "Verify"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}