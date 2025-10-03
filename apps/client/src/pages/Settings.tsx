import React, {useState, useEffect} from 'react';
import {Button} from '../components/ui/button';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '../components/ui/table';
import {Badge} from '../components/ui/badge';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '../components/ui/select';
import {Card, CardContent, CardHeader, CardTitle} from '../components/ui/card';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '../components/ui/tabs';
import {apiRequest} from '../lib/api';
import {User, Role} from '../types';
import {getCurrentUser} from '../lib/auth';
import {ErrorAlert} from '../components/ErrorAlert';
import { EditUserModal } from '../components/EditUserModal';
import { ResetPasswordModal } from '../components/ResetPasswordModal';
import {useFormErrors} from '../hooks/useFormErrors';
import {Users, FileText, KeyRound, Trash2, Plus, Check, X, Edit2Icon, Edit3, Edit} from 'lucide-react';
import {DashboardLayout} from '../components/DashboardLayout';
import {AddUserModal} from '../components/AddUserModal';
import {auditApi} from '../lib/api';
import {FileDropzone} from "@/components/ui/file-dropzone";
import {getSecretsFromServer, createSecretOnServer, deleteSecretOnServer} from "@/lib/sslKeys";
import {SecretMetadata} from "@OpsiMate/shared";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogAction,
    AlertDialogCancel
} from '../components/ui/alert-dialog';
import {AuditLog} from "@OpsiMate/shared";
import {useToast} from "@/hooks/use-toast";
import {Settings as SettingsIcon} from "lucide-react";
import {CustomFieldsTable} from "../components/CustomFieldsTable";
import {useVersion} from "@/hooks/queries";

const PAGE_SIZE = 20;

const Settings: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingUser, setUpdatingUser] = useState<string | null>(null);
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const {generalError, clearErrors, handleApiResponse} = useFormErrors();
    const currentUser = getCurrentUser();
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
    const [showEditModal, setShowEditModal] = useState(false);
    const [userToEdit, setUserToEdit] = useState<User | null>(null);
    const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
    const [userToResetPassword, 
        setUserToResetPassword] = useState<User | null>(null);
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await apiRequest<User[]>('/users', 'GET');
            if (response.success && response.data) {
                setUsers(response.data);
            } else {
                handleApiResponse(response);
            }
        } catch (error) {
            handleApiResponse({
                success: false,
                error: 'Failed to fetch users'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleRoleUpdate = async (email: string, newRole: Role) => {
        setUpdatingUser(email);
        clearErrors();

        try {
            const response = await apiRequest('/users/role', 'PATCH', {email, newRole});
            if (response.success) {
                // Update the local state
                setUsers(prevUsers =>
                    prevUsers.map(user =>
                        user.email === email ? {...user, role: newRole as Role} : user
                    )
                );
            } else {
                handleApiResponse(response);
            }
        } catch (error) {
            handleApiResponse({
                success: false,
                error: 'Failed to update user role'
            });
        } finally {
            setUpdatingUser(null);
        }
    };

    const handleUserCreated = (newUser: User) => {
        setUsers(prevUsers => [...prevUsers, newUser]);
    };

    const getRoleBadgeVariant = (role: Role) => {
        switch (role) {
            case Role.Admin:
                return 'destructive';
            case Role.Editor:
                return 'default';
            case Role.Viewer:
                return 'secondary';
            default:
                return 'outline';
        }
    };
    // Filter users based on search query
    const filteredUsers = users.filter(user =>
        user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Handle bulk role update
    const handleBulkRoleUpdate = async (newRole: Role) => {
        for (const userId of selectedUsers) {
            const user = users.find(u => u.id === userId);
            if (user && user.email !== currentUser?.email) {
                await handleRoleUpdate(user.email, newRole);
            }
        }
        setSelectedUsers([]);
    };

    // Handle bulk delete
    const handleBulkDelete = async () => {
        for (const userId of selectedUsers) {
            if (users.find(u => u.id === userId)?.email !== currentUser?.email) {
                await handleDeleteUser(userId);
            }
        }
        setSelectedUsers([]);
        setShowBulkDeleteConfirm(false);
    };

    // Handle user update from edit modal
    const handleUserUpdated = (updatedUser: User) => {
        setUsers(prevUsers =>
            prevUsers.map(user =>
                user.id === updatedUser.id ? updatedUser : user
            )
        );
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const isAdmin = currentUser?.role === Role.Admin;

    const handleDeleteUser = async (userId: number) => {
        setDeleting(true);
        try {
            const response = await apiRequest(`/users/${userId}`, 'DELETE');
            if (response.success) {
                setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
                setUserToDelete(null);
            } else {
                handleApiResponse(response);
            }
        } catch (error) {
            handleApiResponse({success: false, error: 'Failed to delete user'});
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg">Loading settings...</div>
            </div>
        );
    }

    return (
        <DashboardLayout>
            <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex-shrink-0 bg-background border-b border-border px-6 py-4">
                    <h1 className="text-2xl font-bold">Settings</h1>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6">
                    <div className="max-w-6xl mx-auto">

                        {generalError && <ErrorAlert message={generalError} className="mb-6"/>}

                        <Tabs defaultValue={(function () {
                            const h = (location.hash || '').replace('#', '');
                            if (h === 'Users') return 'users';
                            if (h === 'Audit_Log') return 'audit';
                            if (h === 'secrets') return 'secrets';
                            if (h === 'custom-fields') return 'custom-fields';
                            return 'users';
                        })()} onValueChange={(v) => {
                            const map: Record<string, string> = {
                                users: 'Users',
                                audit: 'Audit_Log',
                                secrets: 'secrets',
                                'custom-fields': 'custom-fields'
                            };
                            const next = map[v] || v;
                            if (next) window.location.hash = next;
                        }} className="space-y-6">
                            <div className="flex gap-6">
                                <div className="w-64 flex-shrink-0">
                                    <TabsList className="flex flex-col items-stretch h-auto p-2 gap-2">
                                        <TabsTrigger value="users" className="justify-start gap-2">
                                            <Users className="h-4 w-4"/>
                                            Users
                                        </TabsTrigger>
                                        <TabsTrigger value="audit" className="justify-start gap-2">
                                            <FileText className="h-4 w-4"/>
                                            Audit Log
                                        </TabsTrigger>
                                        <TabsTrigger value="secrets" className="justify-start gap-2">
                                            <KeyRound className="h-4 w-4"/>
                                            Secrets
                                        </TabsTrigger>
                                        <TabsTrigger value="custom-fields" className="justify-start gap-2">
                                            <SettingsIcon className="h-4 w-4"/>
                                            Custom Service Fields
                                        </TabsTrigger>
                                    </TabsList>
                                </div>
                                <div className="flex-1">

                                    <TabsContent value="users" className="space-y-6">
                                        <div className="flex justify-between items-center gap-4">
                                            <div className="flex-1">
                                                <h2 className="text-2xl font-semibold">User Management</h2>
                                                <p className="text-muted-foreground">Manage user access and permissions for your Service instance.</p>
                                            </div>
                                            <div className="flex gap-2">
                                                {selectedUsers.length > 0 && (
                                                    <>
                                                        <Select
                                                            value=""
                                                            onValueChange={(newRole) => handleBulkRoleUpdate(newRole as Role)}
                                                        >
                                                            <SelectTrigger className="w-40">
                                                                <SelectValue placeholder="Bulk Role Change" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value={Role.Viewer}>Set as Viewer</SelectItem>
                                                                <SelectItem value={Role.Editor}>Set as Editor</SelectItem>
                                                                <SelectItem value={Role.Admin}>Set as Admin</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => setShowBulkDeleteConfirm(true)}
                                                        >
                                                            Delete Selected ({selectedUsers.length})
                                                        </Button>
                                                    </>
                                                )}
                                                <Button onClick={() => setShowAddUserModal(true)} variant="default">
                                                    <Plus className="h-4 w-4 mr-2" />
                                                    Add User
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Search Bar */}
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="Search users by name or email..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="max-w-md"
                                            />
                                            {searchQuery && (
                                                <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')}>
                                                    Clear
                                                </Button>
                                            )}
                                        </div>

                                        {/* Users Table */}
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Current Users ({filteredUsers.length})</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className="w-12">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) {
                                                                            setSelectedUsers(filteredUsers.map(u => u.id));
                                                                        } else {
                                                                            setSelectedUsers([]);
                                                                        }
                                                                    }}
                                                                    className="cursor-pointer"
                                                                />
                                                            </TableHead>
                                                            <TableHead>User</TableHead>
                                                            <TableHead>Email</TableHead>
                                                            <TableHead>Role</TableHead>
                                                            <TableHead>Created</TableHead>
                                                            <TableHead>Actions</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {filteredUsers.map((user) => (
                                                            <TableRow key={user.id}>
                                                                <TableCell>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedUsers.includes(user.id)}
                                                                        onChange={(e) => {
                                                                            if (e.target.checked) {
                                                                                setSelectedUsers(prev => [...prev, user.id]);
                                                                            } else {
                                                                                setSelectedUsers(prev => prev.filter(id => id !== user.id));
                                                                            }
                                                                        }}
                                                                        disabled={user.email === currentUser?.email}
                                                                        className="cursor-pointer"
                                                                    />
                                                                </TableCell>
                                                                <TableCell className="font-medium">
                                                                    {user.fullName}
                                                                    {user.email === currentUser?.email && (
                                                                        <Badge variant="outline" className="ml-2 text-xs">
                                                                            (me)
                                                                        </Badge>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>{user.email}</TableCell>
                                                                <TableCell>
                                                                    <Badge variant={getRoleBadgeVariant(user.role)}>
                                                                        {user.role}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell>{formatDate(user.createdAt)}</TableCell>
                                                                <TableCell>
                                                                    <div className="flex items-center gap-2">
                                                                        <Select
                                                                            value={user.role}
                                                                            onValueChange={(newRole) => handleRoleUpdate(user.email, newRole as Role)}
                                                                            disabled={updatingUser === user.email || user.email === currentUser?.email}
                                                                        >
                                                                            <SelectTrigger className="w-32">
                                                                                <SelectValue />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value={Role.Viewer}>Viewer</SelectItem>
                                                                                <SelectItem value={Role.Editor}>Editor</SelectItem>
                                                                                <SelectItem value={Role.Admin}>Admin</SelectItem>
                                                                            </SelectContent>
                                                                        </Select>
                                                                        {isAdmin && user.email !== currentUser?.email && (
                                                                            <>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    onClick={() => {
                                                                                        setUserToEdit(user);
                                                                                        setShowEditModal(true);
                                                                                    }}
                                                                                    title="Edit user"
                                                                                >
                                                                                    <Edit className="h-4 w-4" />
                                                                                </Button>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    onClick={() => {
                                                                                        setUserToResetPassword(user);
                                                                                        setShowResetPasswordModal(true);
                                                                                    }}
                                                                                    title="Reset password"
                                                                                >
                                                                                    <KeyRound className="h-4 w-4" />
                                                                                </Button>
                                                                                <AlertDialog>
                                                                                    <AlertDialogTrigger asChild>
                                                                                        <Button
                                                                                            variant="ghost"
                                                                                            size="icon"
                                                                                            className="text-red-600 hover:bg-red-100 focus:bg-red-100 focus:ring-2 focus:ring-red-400"
                                                                                            title="Delete user"
                                                                                            onClick={() => setUserToDelete(user)}
                                                                                        >
                                                                                            <Trash2 className="h-4 w-4" />
                                                                                        </Button>
                                                                                    </AlertDialogTrigger>
                                                                                    <AlertDialogContent>
                                                                                        <AlertDialogHeader>
                                                                                            <AlertDialogTitle>Delete User</AlertDialogTitle>
                                                                                            <AlertDialogDescription>
                                                                                                Are you sure you want to delete <b>{userToDelete?.fullName}</b>?
                                                                                                This action cannot be undone.
                                                                                            </AlertDialogDescription>
                                                                                        </AlertDialogHeader>
                                                                                        <AlertDialogFooter>
                                                                                            <AlertDialogCancel
                                                                                                disabled={deleting}
                                                                                                onClick={() => setUserToDelete(null)}>
                                                                                                Cancel
                                                                                            </AlertDialogCancel>
                                                                                            <AlertDialogAction
                                                                                                className="bg-red-600 hover:bg-red-700 focus:ring-red-400"
                                                                                                disabled={deleting}
                                                                                                onClick={() => handleDeleteUser(userToDelete!.id)}
                                                                                            >
                                                                                                {deleting ? 'Deleting...' : 'Delete'}
                                                                                            </AlertDialogAction>
                                                                                        </AlertDialogFooter>
                                                                                    </AlertDialogContent>
                                                                                </AlertDialog>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>

                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </CardContent>
                                        </Card>
                                    </TabsContent>

                                    <TabsContent value="audit" className="space-y-6">
                                        <div>
                                            <h2 className="text-2xl font-semibold">Audit Log</h2>
                                            <p className="text-muted-foreground">View activity logs for all dashboard
                                                operations and user actions.</p>
                                        </div>
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Activity Logs</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <AuditLogTable />
                                            </CardContent>
                                        </Card>
                                    </TabsContent>

                                    <TabsContent value="secrets" className="space-y-6">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h2 className="text-2xl font-semibold">Secrets</h2>
                                                <p className="text-muted-foreground">Manage SSH keys and kubeconfig
                                                    files used to access providers and services securely.</p>
                                            </div>
                                            <AddSecretButton />
                                        </div>

                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Secrets</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <SslKeysTable />
                                            </CardContent>
                                        </Card>
                                    </TabsContent>

                                    <TabsContent value="custom-fields" className="space-y-6">
                                        <div>
                                            <h2 className="text-2xl font-semibold">Custom Service Fields</h2>
                                            <p className="text-muted-foreground">Create and manage custom fields for
                                                your services. These fields can store additional information like
                                                environment, version, or any other metadata.</p>
                                        </div>
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Custom Fields</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <CustomFieldsTable />
                                            </CardContent>
                                        </Card>
                                    </TabsContent>

                                    
                                </div>
                            </div>
                        </Tabs>
                    </div>
                </div>
            </div>
            {/* Add User Modal */}
            <AddUserModal
                isOpen={showAddUserModal}
                onClose={() => setShowAddUserModal(false)}
                onUserCreated={handleUserCreated}
            />


            {/* Edit User Modal */}
            <EditUserModal
                user={userToEdit}
                isOpen={showEditModal}
                onClose={() => {
                    setShowEditModal(false);
                    setUserToEdit(null);
                }}
                onUserUpdated={handleUserUpdated}
            />

            {/* Reset Password Modal */}
            <ResetPasswordModal
                user={userToResetPassword}
                isOpen={showResetPasswordModal}
                onClose={() => {
                    setShowResetPasswordModal(false);
                    setUserToResetPassword(null);
                }}
            />

            {/* Bulk Delete Confirmation */}
            <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Multiple Users</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete {selectedUsers.length} user(s)? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={handleBulkDelete}
                        >
                            Delete {selectedUsers.length} User(s)
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
                    </AlertDialog>
        
        {/* Version Footer */}
        <VersionFooter />
        </DashboardLayout>
    );
};

// Version Footer Component
const VersionFooter: React.FC = () => {
    const { data: versionInfo, isLoading, error } = useVersion();
    
    if (isLoading) {
        return (
            <div className="border-t border-border bg-muted/30">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-4">
                            <span className="font-medium">Loading version information...</span>
                        </div>
                        <div className="text-xs">
                            © 2024 OpsiMate. All rights reserved.
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    
    if (error || !versionInfo) {
        return (
            <div className="border-t border-border bg-muted/30">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-4">
                            <span className="font-medium">OpsiMate</span>
                        </div>
                        <div className="text-xs">
                            © 2024 OpsiMate. All rights reserved.
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="border-t border-border bg-muted/30">
            <div className="max-w-6xl mx-auto px-6 py-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-4">
                        <span className="font-medium">
                            {versionInfo.name} v{versionInfo.version}
                        </span>
                        {versionInfo.buildDate && (
                            <span className="text-xs">
                                Build: {new Date(versionInfo.buildDate).toLocaleDateString()}
                            </span>
                        )}
                    </div>
                    <div className="text-xs">
                        © {new Date().getFullYear()} OpsiMate. All rights reserved.
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper to parse SQLite UTC timestamp as ISO 8601
function parseUTCDate(dateString: string) {
    return new Date(dateString.replace(' ', 'T') + 'Z');
}

function formatRelativeTime(dateString: string) {
    const now = new Date();
    const date = parseUTCDate(dateString);
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000); // in seconds
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} minute${Math.floor(diff / 60) === 1 ? '' : 's'} ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) === 1 ? '' : 's'} ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) === 1 ? '' : 's'} ago`;
    return date.toLocaleDateString();
}

const AuditLogTable: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        auditApi.getAuditLogs(page, PAGE_SIZE).then(res => {
            if (mounted) {
                if (res && Array.isArray(res.logs)) {
                    setLogs(res.logs);
                    setTotal(res.total || 0);
                    setError(null);
                } else {
                    setError(res?.error || 'Failed to fetch audit logs');
                }
                setLoading(false);
            }
        });
        return () => {
            mounted = false;
        };
    }, [page]);

    const totalPages = Math.ceil(total / PAGE_SIZE);

    if (loading) return <div className="py-8 text-center">Loading audit logs...</div>;
    if (error) return <ErrorAlert message={error} className="mb-4"/>;
    if (!logs.length) return <div className="py-8 text-center text-muted-foreground">No audit logs found.</div>;

    // Helper for action badge color
    const getActionBadgeProps = (action: string) => {
        switch (action) {
            case 'CREATE':
                return {variant: 'secondary', className: 'bg-green-100 text-green-800 border-green-200'};
            case 'UPDATE':
                return {variant: 'secondary', className: 'bg-yellow-100 text-yellow-800 border-yellow-200'};
            case 'DELETE':
                return {variant: 'destructive', className: ''};
            default:
                return {variant: 'outline', className: ''};
        }
    };

    return (
        <div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Resource</TableHead>
                        <TableHead>Resource Name</TableHead>
                        <TableHead>User</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {logs.map(log => {
                        const actionProps = getActionBadgeProps(log.actionType);
                        return (
                            <TableRow key={log.id}>
                                <TableCell>
                                    <span title={parseUTCDate(log.timestamp).toLocaleString()}>
                                        {formatRelativeTime(log.timestamp)}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={actionProps.variant as any} className={actionProps.className}>
                                        {log.actionType}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="secondary">{log.resourceType}</Badge>
                                </TableCell>
                                <TableCell>{log.resourceName || '-'}</TableCell>
                                <TableCell>{log.userName || '-'}</TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
            {totalPages > 1 && (
                <div className="flex justify-end items-center gap-2 mt-4">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}>&larr; Prev</Button>
                    <span className="text-sm">Page {page} of {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}>Next &rarr;</Button>
                </div>
            )}
        </div>
    );
};

const AddSecretButton: React.FC = () => {
    const [open, setOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const [displayName, setDisplayName] = useState<string>("");
    const [secretType, setSecretType] = useState<'ssh' | 'kubeconfig'>('ssh');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isFileValid, setIsFileValid] = useState<boolean | null>(null);
    const {toast} = useToast();

    const handleFile = async (file: File) => {
        // todo: implement file validation
        setIsFileValid(true);
        setSelectedFile(file);
        setFileName(file.name);
    };

    const handleSave = async () => {
        if (!selectedFile) return;

        setUploading(true);
        try {
            const name = displayName.trim() || fileName || "key";
            const result = await createSecretOnServer(name, selectedFile, secretType);

            if (result.success) {
                toast({
                    title: "Success",
                    description: "Secret created successfully",
                });
                window.dispatchEvent(new Event('secrets-updated'));
                setOpen(false);
                resetForm();
            } else {
                toast({
                    title: "Error",
                    description: result.error || "Failed to create secret",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Error creating SSL key:', error);
            toast({
                title: "Error",
                description: "An unexpected error occurred while creating the secret",
                variant: "destructive",
            });
        } finally {
            setUploading(false);
        }
    };

    const resetForm = () => {
        setFileName(null);
        setDisplayName("");
        setSecretType('ssh');
        setSelectedFile(null);
        setIsFileValid(null);
    };

    return (
        <Dialog open={open} onOpenChange={(newOpen) => {
            setOpen(newOpen);
            if (!newOpen) {
                resetForm();
            }
        }}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="h-4 w-4 mr-2"/> Add Secret
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Secret</DialogTitle>
                    <DialogDescription>Upload a secret file (SSH key or kubeconfig). It will be encrypted and stored
                        securely.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                    <div className="space-y-2">
                        <Label htmlFor="secret-name">Secret name</Label>
                        <Input id="secret-name" placeholder="My SSH Key" value={displayName}
                               onChange={(e) => setDisplayName(e.target.value)}/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="secret-type">Type</Label>
                        <Select value={secretType}
                                onValueChange={(value: 'ssh' | 'kubeconfig') => setSecretType(value)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select type"/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ssh">SSH Key</SelectItem>
                                <SelectItem value="kubeconfig">Kubeconfig</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <FileDropzone
                        id="secret-upload"
                        accept="*"
                        loading={uploading}
                        onFile={handleFile}
                        multiple={false}
                    />
                    {fileName && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                                <span>Selected: <b>{fileName}</b></span>
                                {isFileValid !== null && (
                                    isFileValid ? (
                                        <Check className="h-4 w-4 text-green-600"/>
                                    ) : (
                                        <X className="h-4 w-4 text-red-600"/>
                                    )
                                )}
                            </div>
                            {isFileValid === false && (
                                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                                    <X className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0"/>
                                    <div className="text-sm text-red-700">
                                        <p className="font-medium">Invalid file format</p>
                                        <p className="text-red-600 mt-1">
                                            This file doesn't appear to be a valid secret file. Please ensure you're
                                            uploading an SSH key or kubeconfig file.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button disabled={!fileName || isFileValid === false} onClick={handleSave}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const SslKeysTable: React.FC = () => {
    const [secrets, setSecrets] = useState<SecretMetadata[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<number | null>(null);
    const {toast} = useToast();

    const loadSecrets = async () => {
        setLoading(true);
        try {
            const secretsData = await getSecretsFromServer();
            setSecrets(secretsData);
            setError(null);
        } catch (error) {
            console.error('Error loading secrets:', error);
            setError('Failed to load secrets');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSecret = async (secretId: number) => {
        setDeleting(secretId);
        try {
            const result = await deleteSecretOnServer(secretId);
            if (result.success) {
                toast({
                    title: "Success",
                    description: "Secret deleted successfully",
                });
                loadSecrets(); // Refresh the list
            } else {
                toast({
                    title: "Error",
                    description: result.error || "Failed to delete secret",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Error deleting SSL key:', error);
            toast({
                title: "Error",
                description: "An unexpected error occurred while deleting the secret",
                variant: "destructive",
            });
        } finally {
            setDeleting(null);
        }
    };

    useEffect(() => {
        loadSecrets();

        // Listen for updates
        const handleSecretsUpdated = () => {
            loadSecrets();
        };

        window.addEventListener('secrets-updated', handleSecretsUpdated);
        return () => window.removeEventListener('secrets-updated', handleSecretsUpdated);
    }, []);

    if (loading) return <div className="py-6 text-center">Loading secrets...</div>;
    if (error) return <div className="py-6 text-center text-red-600">{error}</div>;
    if (!secrets.length) return <div className="py-6 text-center text-muted-foreground">No secrets added yet.</div>;

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Secret Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {secrets.map(secret => (
                    <TableRow key={secret.id}>
                        <TableCell><b>{secret.name}</b></TableCell>
                        <TableCell>
                            <Badge variant={secret.type === 'kubeconfig' ? 'secondary' : 'default'}>
                                {secret.type === 'kubeconfig' ? 'Kubeconfig' : 'SSH Key'}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                                        title="Delete SSL key"
                                        disabled={deleting === secret.id}
                                    >
                                        <Trash2 className="h-4 w-4"/>
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Secret</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Are you sure you want to delete "<b>{secret.name}</b>"? This action cannot
                                            be undone and will permanently remove the secret file.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel disabled={deleting === secret.id}>
                                            Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                            className="bg-red-600 hover:bg-red-700 focus:ring-red-400"
                                            disabled={deleting === secret.id}
                                            onClick={() => handleDeleteSecret(secret.id)}
                                        >
                                            {deleting === secret.id ? 'Deleting...' : 'Delete'}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};