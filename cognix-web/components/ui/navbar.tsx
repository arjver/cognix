import React from "react";
import { Button } from "./button";

const Navbar = () => {
  return (
    <nav className="flex items-center justify-between p-4">
      <div className="text-lg font-bold">Cognix</div>
      <Button className="bg-white text-black hover:bg-gray-200">Sign In</Button>
    </nav>
  );
};

export default Navbar;