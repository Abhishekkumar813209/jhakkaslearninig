import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, BookOpen, User, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-card border-b border-border shadow-soft sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <BookOpen className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-foreground">Jhakkas</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <Link to="/courses">
              <Button variant="nav" size="sm">
                Courses
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="nav" size="sm">
                Dashboard
              </Button>
            </Link>
            <Link to="/quiz">
              <Button variant="nav" size="sm">
                Practice
              </Button>
            </Link>
            <Link to="/about">
              <Button variant="nav" size="sm">
                About Us
              </Button>
            </Link>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <Button variant="ghost" size="icon">
              <ShoppingCart className="h-5 w-5" />
            </Button>
            <Button variant="outline">
              <User className="h-4 w-4 mr-2" />
              Login
            </Button>
            <Button variant="hero">Get Started</Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col space-y-3">
              <Link to="/courses" onClick={() => setIsMenuOpen(false)}>
                <Button variant="nav" size="sm" className="w-full justify-start">
                  Courses
                </Button>
              </Link>
              <Link to="/dashboard" onClick={() => setIsMenuOpen(false)}>
                <Button variant="nav" size="sm" className="w-full justify-start">
                  Dashboard
                </Button>
              </Link>
              <Link to="/quiz" onClick={() => setIsMenuOpen(false)}>
                <Button variant="nav" size="sm" className="w-full justify-start">
                  Practice
                </Button>
              </Link>
              <Link to="/about" onClick={() => setIsMenuOpen(false)}>
                <Button variant="nav" size="sm" className="w-full justify-start">
                  About Us
                </Button>
              </Link>
              <div className="flex flex-col space-y-2 px-3 pt-4">
                <Button variant="outline" className="w-full">
                  <User className="h-4 w-4 mr-2" />
                  Login
                </Button>
                <Button variant="hero" className="w-full">
                  Get Started
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;