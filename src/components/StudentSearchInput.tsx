import { useState, useRef, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, X, User } from "lucide-react";
import { useStudentSearch } from "@/hooks/useStudentSearch";

interface Student {
  id: string;
  name: string;
  email?: string;
}

interface StudentSearchInputProps {
  selectedStudent: string;
  onStudentSelect: (studentId: string) => void;
  placeholder?: string;
}

const StudentSearchInput = ({ 
  selectedStudent, 
  onStudentSelect, 
  placeholder = "Search students..." 
}: StudentSearchInputProps) => {
  const { students, allStudents, loading, searchQuery, setSearchQuery } = useStudentSearch();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStudentName, setSelectedStudentName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get selected student name
  useEffect(() => {
    const student = allStudents.find(s => s.id === selectedStudent);
    setSelectedStudentName(student?.name || '');
  }, [selectedStudent, allStudents]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setSearchQuery]);

  const handleInputFocus = () => {
    setIsOpen(true);
    setSearchQuery('');
  };

  const handleStudentSelect = (student: Student) => {
    onStudentSelect(student.id);
    setSelectedStudentName(student.name);
    setIsOpen(false);
    setSearchQuery('');
    inputRef.current?.blur();
  };

  const handleInputChange = (value: string) => {
    setSearchQuery(value);
    setIsOpen(true);
  };

  const clearSelection = () => {
    setSelectedStudentName('');
    setSearchQuery('');
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const displayValue = isOpen ? searchQuery : selectedStudentName;

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={selectedStudentName || placeholder}
          value={displayValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleInputFocus}
          className="pl-10 pr-10 w-full h-10 min-w-64"
        />
        {selectedStudentName && !isOpen && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            onClick={clearSelection}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {isOpen && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-60 overflow-y-auto shadow-lg">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 text-center text-muted-foreground">
                Loading students...
              </div>
            ) : students.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                {searchQuery ? 'No students found' : 'No students available'}
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto">
                {students.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => handleStudentSelect(student)}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${student.name}`} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{student.name}</div>
                      {student.email && (
                        <div className="text-xs text-muted-foreground truncate">{student.email}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentSearchInput;