"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  Users,
  Search,
  MoreHorizontal,
  UserPlus,
  Edit,
  Trash2,
  Shield,
  UserCheck,
  UserX,
  Crown,
  RefreshCw,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface User {
  id: string
  email: string
  role: "user" | "admin" | "superadmin"
  created_at: string
  full_name?: string
  company_name?: string
  subscription_status?: "active" | "inactive" | "expired"
  subscription_plan?: string
}

interface UserManagementProps {
  userRole: string
}

export function UserManagement({ userRole }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newUser, setNewUser] = useState({ email: "", role: "user" })
  const { toast } = useToast()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users")
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch users",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error fetching users:", error)
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateUser = async (userId: string, updates: Partial<User>) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        await fetchUsers()
        setEditingUser(null)
        toast({
          title: "Success",
          description: "User updated successfully",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.message || "Failed to update user",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error updating user:", error)
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      })
    }
  }

  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        await fetchUsers()
        setDeletingUser(null)
        toast({
          title: "Success",
          description: "User deleted successfully",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.message || "Failed to delete user",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error deleting user:", error)
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      })
    }
  }

  const handleCreateUser = async () => {
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      })

      if (response.ok) {
        await fetchUsers()
        setShowCreateDialog(false)
        setNewUser({ email: "", role: "user" })
        toast({
          title: "Success",
          description: "User created successfully",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.message || "Failed to create user",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error creating user:", error)
      toast({
        title: "Error",
        description: "Failed to create user",
        variant: "destructive",
      })
    }
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === "all" || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "superadmin":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Crown className="w-3 h-3 mr-1" />
            Super Admin
          </Badge>
        )
      case "admin":
        return (
          <Badge variant="secondary">
            <Shield className="w-3 h-3 mr-1" />
            Admin
          </Badge>
        )
      default:
        return <Badge variant="outline">User</Badge>
    }
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-100 text-green-800">
            <UserCheck className="w-3 h-3 mr-1" />
            Active
          </Badge>
        )
      case "expired":
        return (
          <Badge className="bg-red-100 text-red-800">
            <UserX className="w-3 h-3 mr-1" />
            Expired
          </Badge>
        )
      default:
        return <Badge variant="outline">Inactive</Badge>
    }
  }

  const canEditUser = (user: User) => {
    if (userRole === "superadmin") return true
    if (userRole === "admin" && user.role === "user") return true
    return false
  }

  const canDeleteUser = (user: User) => {
    if (userRole === "superadmin" && user.role !== "superadmin") return true
    if (userRole === "admin" && user.role === "user") return true
    return false
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground mt-1">Manage user accounts, roles, and permissions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchUsers} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Users ({filteredUsers.length})
          </CardTitle>
          <CardDescription>Search and filter user accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search users by email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
                <SelectItem value="superadmin">Super Admins</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.email}</p>
                        {user.full_name && <p className="text-sm text-muted-foreground">{user.full_name}</p>}
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {getStatusBadge(user.subscription_status)}
                        {user.subscription_plan && (
                          <p className="text-xs text-muted-foreground">{user.subscription_plan}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{user.company_name || <span className="text-muted-foreground">-</span>}</TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {canEditUser(user) && (
                            <DropdownMenuItem onClick={() => setEditingUser(user)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit User
                            </DropdownMenuItem>
                          )}
                          {canDeleteUser(user) && (
                            <DropdownMenuItem onClick={() => setDeletingUser(user)} className="text-red-600">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete User
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user role and permissions</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input value={editingUser.email} disabled />
              </div>
              <div>
                <Label>Role</Label>
                <Select
                  value={editingUser.role}
                  onValueChange={(value) => setEditingUser({ ...editingUser, role: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    {userRole === "superadmin" && <SelectItem value="superadmin">Super Admin</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button onClick={() => editingUser && handleUpdateUser(editingUser.id, { role: editingUser.role })}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deletingUser && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-medium">{deletingUser.email}</p>
              <p className="text-sm text-muted-foreground">Role: {deletingUser.role}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingUser(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => deletingUser && handleDeleteUser(deletingUser.id)}>
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>Add a new user to the system</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  {userRole === "superadmin" && <SelectItem value="superadmin">Super Admin</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser} disabled={!newUser.email}>
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
