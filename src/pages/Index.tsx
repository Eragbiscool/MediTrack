import { useState } from "react";
import { UserSelection } from "@/components/UserSelection";
import { MedicineDashboard } from "@/components/MedicineDashboard";

const Index = () => {
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null);

  const handleUserSelect = (userId: string, userName: string) => {
    setSelectedUser({ id: userId, name: userName });
  };

  const handleLogout = () => {
    setSelectedUser(null);
  };

  return (
    <>
      {!selectedUser ? (
        <UserSelection onUserSelect={handleUserSelect} />
      ) : (
        <MedicineDashboard
          userId={selectedUser.id}
          userName={selectedUser.name}
          onLogout={handleLogout}
        />
      )}
    </>
  );
};

export default Index;
