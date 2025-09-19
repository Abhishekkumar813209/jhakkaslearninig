import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export const TestCreateCourse = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: 'Test Course',
    description: 'This is a test course description',
    subject: 'Computer Science',
    level: 'beginner',
    price: 0,
    is_paid: false,
    is_published: true
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const testCreateCourse = async () => {
    try {
      setLoading(true);
      
      // Get current session
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        toast.error('Please login first to test the API');
        return;
      }

      // Test the courses API
      const { data, error } = await supabase.functions.invoke('courses-api', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: {
          ...formData,
          instructor_id: session.session.user.id
        }
      });

      if (error) {
        console.error('API Error:', error);
        toast.error(`API Error: ${error.message}`);
        return;
      }

      console.log('Success Response:', data);
      toast.success('Course created successfully!');
      
      // Reset form
      setFormData({
        title: 'Test Course',
        description: 'This is a test course description',
        subject: 'Computer Science',
        level: 'beginner',
        price: 0,
        is_paid: false,
        is_published: true
      });

    } catch (err) {
      console.error('Test Error:', err);
      toast.error(`Test failed: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Test Create Course API</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <Input
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="Course title"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <Textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Course description"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Subject</label>
          <Input
            value={formData.subject}
            onChange={(e) => handleInputChange('subject', e.target.value)}
            placeholder="Course subject"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Level</label>
          <select
            value={formData.level}
            onChange={(e) => handleInputChange('level', e.target.value)}
            className="w-full p-2 border rounded-md"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Price</label>
          <Input
            type="number"
            value={formData.price}
            onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
            placeholder="Course price"
          />
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_paid}
              onChange={(e) => handleInputChange('is_paid', e.target.checked)}
            />
            Is Paid Course
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_published}
              onChange={(e) => handleInputChange('is_published', e.target.checked)}
            />
            Is Published
          </label>
        </div>

        <Button 
          onClick={testCreateCourse} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Creating Course...' : 'Test Create Course API'}
        </Button>

        <div className="text-sm text-muted-foreground">
          <p><strong>Note:</strong> Make sure you're logged in as an instructor or admin to test this API.</p>
          <p>Check the browser console and network tab for detailed API responses.</p>
        </div>
      </CardContent>
    </Card>
  );
};