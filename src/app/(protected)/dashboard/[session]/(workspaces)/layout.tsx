import { Navbar } from "@/components/navbar";
import React from "react";

type Props = {
  children: React.ReactNode;
};

const Layout = async ({ children }: Props) => {
  // Remove forced redirect - users can access dashboard without subscription
  // They can navigate to billing page if they want to subscribe

  return (
    <div className="grid grid-cols-1">
      <Navbar />
      {children}
    </div>
  );
};

export default Layout;
