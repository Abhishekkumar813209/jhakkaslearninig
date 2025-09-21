import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, BookOpen, User, ShoppingCart, LogOut, BarChart3, Trophy, FileText, Settings, Map } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { authAPI } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isAdmin, isStudent, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      toast({
        title: 'Logged out successfully',
        description: 'See you again soon!',
      });
      navigate('/');
    } catch (error) {
      // Fallback to local signOut
      await signOut();
      toast({
        title: 'Logged out',
        description: 'You have been logged out.',
      });
      navigate('/');
    }
  };

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
          <div className="hidden md:flex items-center space-x-2">
            {!user ? (
              // Guest Navigation
              <>
                <Link to="/courses">
                  <Button variant="nav" size="sm">
                    Courses
                  </Button>
                </Link>
                <Link to="/about">
                  <Button variant="nav" size="sm">
                    About Us
                  </Button>
                </Link>
              </>
            ) : isStudent ? (
              // Student Navigation
              <>
                <Link to="/dashboard">
                  <Button variant="nav" size="sm">
                    Dashboard
                  </Button>
                </Link>
                <Link to="/student">
                  <Button variant="nav" size="sm">
                    Roadmap
                  </Button>
                </Link>
                <Link to="/courses">
                  <Button variant="nav" size="sm">
                    Courses
                  </Button>
                </Link>
                <Link to="/tests">
                  <Button variant="nav" size="sm">
                    Tests
                  </Button>
                </Link>
                <Link to="/leaderboard">
                  <Button variant="nav" size="sm">
                    Leaderboard
                  </Button>
                </Link>
                <Link to="/analytics">
                  <Button variant="nav" size="sm">
                    Analytics
                  </Button>
                </Link>
              </>
            ) : isAdmin ? (
              // Admin Navigation
              <>
                <Link to="/admin">
                  <Button variant="nav" size="sm">
                    Admin Dashboard
                  </Button>
                </Link>
                <Link to="/student">
                  <Button variant="nav" size="sm">
                    Student
                  </Button>
                </Link>
                <Link to="/courses">
                  <Button variant="nav" size="sm">
                    Courses
                  </Button>
                </Link>
                <Link to="/tests">
                  <Button variant="nav" size="sm">
                    Tests
                  </Button>
                </Link>
                <Link to="/analytics">
                  <Button variant="nav" size="sm">
                    Analytics
                  </Button>
                </Link>
              </>
            ) : null}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            {!user ? (
              // Guest Actions
              <>
                <Link to="/login">
                  <Button variant="outline">
                    <User className="h-4 w-4 mr-2" />
                    Login
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="hero">Get Started</Button>
                </Link>
              </>
            ) : (
              // Authenticated Actions
              <>
                <Link to="/profile">
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </Link>
                <Button variant="outline" onClick={signOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </>
            )}
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
              {!user ? (
                // Guest Mobile Navigation
                <>
                  <Link to="/courses" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="nav" size="sm" className="w-full justify-start">
                      Courses
                    </Button>
                  </Link>
                  <Link to="/about" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="nav" size="sm" className="w-full justify-start">
                      About Us
                    </Button>
                  </Link>
                  <div className="flex flex-col space-y-2 px-3 pt-4">
                    <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="outline" className="w-full">
                        <User className="h-4 w-4 mr-2" />
                        Login
                      </Button>
                    </Link>
                    <Link to="/register" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="hero" className="w-full">
                        Get Started
                      </Button>
                    </Link>
                  </div>
                </>
              ) : isStudent ? (
                // Student Mobile Navigation
                <>
                  <Link to="/dashboard" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="nav" size="sm" className="w-full justify-start">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Dashboard
                    </Button>
                  </Link>
                  <Link to="/student" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="nav" size="sm" className="w-full justify-start">
                      <Map className="h-4 w-4 mr-2" />
                      Roadmap
                    </Button>
                  </Link>
                  <Link to="/courses" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="nav" size="sm" className="w-full justify-start">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Courses
                    </Button>
                  </Link>
                  <Link to="/tests" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="nav" size="sm" className="w-full justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      Tests
                    </Button>
                  </Link>
                  <Link to="/leaderboard" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="nav" size="sm" className="w-full justify-start">
                      <Trophy className="h-4 w-4 mr-2" />
                      Leaderboard
                    </Button>
                  </Link>
                  <Link to="/analytics" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="nav" size="sm" className="w-full justify-start">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Analytics
                    </Button>
                  </Link>
                  <Link to="/profile" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="nav" size="sm" className="w-full justify-start">
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </Button>
                  </Link>
                  <div className="flex flex-col space-y-2 px-3 pt-4">
                    <Button variant="outline" className="w-full" onClick={signOut}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </div>
                </>
              ) : isAdmin ? (
                // Admin Mobile Navigation
                <>
                  <Link to="/admin" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="nav" size="sm" className="w-full justify-start">
                      <Settings className="h-4 w-4 mr-2" />
                      Admin Dashboard
                    </Button>
                  </Link>
                  <Link to="/student" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="nav" size="sm" className="w-full justify-start">
                      <Map className="h-4 w-4 mr-2" />
                      Student
                    </Button>
                  </Link>
                  <Link to="/courses" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="nav" size="sm" className="w-full justify-start">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Courses
                    </Button>
                  </Link>
                  <Link to="/tests" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="nav" size="sm" className="w-full justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      Tests
                    </Button>
                  </Link>
                  <Link to="/analytics" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="nav" size="sm" className="w-full justify-start">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Analytics
                    </Button>
                  </Link>
                  <Link to="/profile" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="nav" size="sm" className="w-full justify-start">
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </Button>
                  </Link>
                  <div className="flex flex-col space-y-2 px-3 pt-4">
                    <Button variant="outline" className="w-full" onClick={signOut}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;