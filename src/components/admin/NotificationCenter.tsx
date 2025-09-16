import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Bell, Send, Users, MessageSquare, Mail, Smartphone, Plus, Edit, Trash2 } from "lucide-react";

// Mock notification data
const recentNotifications = [
  {
    id: "1",
    title: "New Physics Test Available",
    message: "A new physics test on Motion and Force is now available for JEE Main batch.",
    type: "test",
    audience: "JEE Main 2024",
    recipients: 450,
    sentAt: "2024-03-15T10:30:00Z",
    status: "sent",
    channels: ["push", "email"]
  },
  {
    id: "2", 
    title: "Study Streak Broken Alert",
    message: "Your 15-day study streak has been broken. Start a new streak today!",
    type: "streak",
    audience: "Individual",
    recipients: 1,
    sentAt: "2024-03-14T18:00:00Z",
    status: "sent",
    channels: ["push", "sms"]
  },
  {
    id: "3",
    title: "Batch Promotion Announcement",
    message: "Congratulations! You have been promoted to JEE Advanced batch based on your performance.",
    type: "promotion",
    audience: "Individual",
    recipients: 25,
    sentAt: "2024-03-13T15:45:00Z",
    status: "sent",
    channels: ["push", "email", "sms"]
  }
];

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState(recentNotifications);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const getTypeColor = (type: string) => {
    const colors = {
      test: "bg-blue-100 text-blue-800",
      streak: "bg-orange-100 text-orange-800",
      promotion: "bg-green-100 text-green-800",
      announcement: "bg-purple-100 text-purple-800",
      reminder: "bg-yellow-100 text-yellow-800"
    };
    return colors[type as keyof typeof colors] || colors.announcement;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      sent: "bg-green-100 text-green-800",
      scheduled: "bg-blue-100 text-blue-800",
      draft: "bg-gray-100 text-gray-800",
      failed: "bg-red-100 text-red-800"
    };
    return colors[status as keyof typeof colors] || colors.draft;
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "push":
        return <Bell className="h-3 w-3" />;
      case "email":
        return <Mail className="h-3 w-3" />;
      case "sms":
        return <Smartphone className="h-3 w-3" />;
      default:
        return <MessageSquare className="h-3 w-3" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Notification Center</h2>
          <p className="text-muted-foreground">Send announcements and manage notifications</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Notification
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Notification</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Notification Title" />
              <Textarea placeholder="Message content..." rows={4} />
              
              <div className="grid grid-cols-2 gap-4">
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Notification Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="announcement">Announcement</SelectItem>
                    <SelectItem value="test">Test Available</SelectItem>
                    <SelectItem value="reminder">Reminder</SelectItem>
                    <SelectItem value="promotion">Promotion</SelectItem>
                    <SelectItem value="streak">Streak Alert</SelectItem>
                  </SelectContent>
                </Select>

                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Target Audience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Students</SelectItem>
                    <SelectItem value="jee-main">JEE Main 2024</SelectItem>
                    <SelectItem value="jee-advanced">JEE Advanced</SelectItem>
                    <SelectItem value="neet">NEET 2024</SelectItem>
                    <SelectItem value="foundation">Foundation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Delivery Channels</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked />
                    <Bell className="h-4 w-4" />
                    Push Notification
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" />
                    <Mail className="h-4 w-4" />
                    Email
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" />
                    <Smartphone className="h-4 w-4" />
                    SMS
                  </label>
                </div>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1 flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Send Now
                </Button>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Save as Draft
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="card-gradient shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Sent</p>
                <p className="text-2xl font-bold text-foreground">1,247</p>
              </div>
              <Send className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-gradient shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Open Rate</p>
                <p className="text-2xl font-bold text-foreground">89.2%</p>
              </div>
              <Mail className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-gradient shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold text-foreground">1,125</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-gradient shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold text-foreground">47</p>
              </div>
              <Bell className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Notifications */}
      <Card className="card-gradient shadow-soft">
        <CardHeader>
          <CardTitle>Recent Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div key={notification.id} className="p-4 border border-border rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">{notification.title}</h3>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(notification.type)}`}>
                        {notification.type}
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(notification.status)}`}>
                        {notification.status}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>To: {notification.audience}</span>
                      <span>{notification.recipients} recipients</span>
                      <span>{new Date(notification.sentAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <div className="flex gap-1">
                      {notification.channels.map((channel, index) => (
                        <div key={index} className="p-1 bg-muted rounded">
                          {getChannelIcon(channel)}
                        </div>
                      ))}
                    </div>
                    <Button size="sm" variant="outline">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-gradient shadow-soft cursor-pointer hover:shadow-medium transition-shadow">
          <CardContent className="p-6 text-center">
            <Bell className="h-12 w-12 text-blue-600 mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Test Reminder</h3>
            <p className="text-sm text-muted-foreground">Send reminder for upcoming tests</p>
          </CardContent>
        </Card>

        <Card className="card-gradient shadow-soft cursor-pointer hover:shadow-medium transition-shadow">
          <CardContent className="p-6 text-center">
            <Users className="h-12 w-12 text-green-600 mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Batch Announcement</h3>
            <p className="text-sm text-muted-foreground">Send message to specific batch</p>
          </CardContent>
        </Card>

        <Card className="card-gradient shadow-soft cursor-pointer hover:shadow-medium transition-shadow">
          <CardContent className="p-6 text-center">
            <MessageSquare className="h-12 w-12 text-purple-600 mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Motivational Message</h3>
            <p className="text-sm text-muted-foreground">Send encouragement to students</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotificationCenter;