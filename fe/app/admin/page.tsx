'use client'

import './admin.css'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  FolderKanban,
  GalleryHorizontalEnd,
  KeyRound,
  LayoutDashboard,
  Loader2,
  LogOut,
  Pencil,
  Plus,
  Settings2,
  Trash2,
  Upload,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { RichTextEditor } from '@/components/rich-text-editor'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { cleanRichText, stripHtml } from '@/lib/html'
import {
  ApiError,
  changePassword,
  clearSession,
  createGallery,
  createNews,
  createService,
  deleteGallery,
  deleteNews,
  deleteService,
  getAdminGallery,
  getAdminNews,
  getAdminServices,
  getDashboardSummary,
  getToken,
  getUser,
  updateGallery,
  updateNews,
  updateService,
  type AdminUser,
  type DashboardSummary,
  type GalleryItem,
  type NewsItem,
  type Service,
} from '@/lib/api'

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'services', label: 'Manage Services', icon: Settings2 },
  { id: 'news', label: 'Manage News', icon: FileText },
  { id: 'gallery', label: 'Manage Gallery', icon: GalleryHorizontalEnd },
]

const serviceIconOptions = [
  { value: 'IdCard', label: 'ID card' },
  { value: 'Globe2', label: 'Globe' },
  { value: 'BriefcaseBusiness', label: 'Briefcase' },
  { value: 'ShieldCheck', label: 'Shield check' },
  { value: 'FileCheck2', label: 'Document check' },
  { value: 'UsersRound', label: 'People' },
  { value: 'Headphones', label: 'Support' },
  { value: 'Sparkles', label: 'Sparkles' },
]

const newsCategories = ['Company', 'Guide', 'Regulation', 'Work Permit']
const galleryCategories = ['Team Activities', 'Client Consultation', 'Our Workspace']

function statusLabel(status: string) {
  if (status === 'PUBLISHED') return 'Published'
  if (status === 'DRAFT') return 'Draft'
  if (status === 'ACTIVE') return 'Active'
  return 'Inactive'
}

function todayDisplay() {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}`
}

function greeting() {
  const hour = new Date().getHours()
  if (hour >= 4 && hour < 11) return 'Good morning'
  if (hour >= 11 && hour < 16) return 'Good afternoon'
  return 'Good evening'
}

function failMessage(err: unknown, fallback: string) {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) {
      clearSession()
      window.location.assign('/admin/login')
      return 'Session expired. Please sign in again.'
    }
    return err.message
  }
  return fallback
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'AM'
  return parts.slice(0, 2).map((part) => part[0]!.toUpperCase()).join('')
}

function Notice({ message }: { message: string }) {
  if (!message) return null
  return (
    <p className="admin-login-error mb-5" role="alert">
      <AlertCircle size={15} />
      {message}
    </p>
  )
}

function StatCard({ label, value, note, icon: Icon }: { label: string; value: string; note: string; icon: typeof FileText }) {
  return <Card className="admin-stat-card"><CardContent className="p-5"><div className="flex items-start justify-between"><div><p className="admin-muted text-xs font-medium uppercase tracking-wider">{label}</p><p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p><p className="admin-muted mt-2 text-xs">{note}</p></div><div className="admin-icon-box"><Icon /></div></div></CardContent></Card>
}

function ConfirmDelete({ label, onConfirm }: { label: string; onConfirm: () => void }) {
  const [open, setOpen] = useState(false)
  return <Dialog open={open} onOpenChange={setOpen}><Button variant="ghost" size="icon" aria-label={`Delete ${label}`} onClick={() => setOpen(true)}><Trash2 /></Button><DialogContent className="admin-dialog-content"><DialogHeader><DialogTitle>Delete item?</DialogTitle><DialogDescription>Are you sure you want to delete “{label}”? This action cannot be undone.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>No</Button><Button className="admin-danger" onClick={() => { onConfirm(); setOpen(false) }}>Yes</Button></DialogFooter></DialogContent></Dialog>
}

function PageTitle({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="admin-kicker">PT FASQINDO MANDIRI BERSAMA / ADMIN</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1><p className="admin-muted mt-2 text-sm">{description}</p></div>{action}</div>
}

function ChangePasswordDialog({ open, onOpenChange, onLogout }: { open: boolean; onOpenChange: (open: boolean) => void; onLogout: () => void }) {
  const { toast } = useToast()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [saving, setSaving] = useState(false)

  const close = () => {
    onOpenChange(false)
    setCurrent('')
    setNext('')
    setConfirm('')
    setError('')
    setOk('')
    setSaving(false)
  }

  const submit = async () => {
    if (!current) { setError('Please enter your current password.'); setOk(''); return }
    if (next.length < 6) { setError('New password must be at least 6 characters.'); setOk(''); return }
    if (next !== confirm) { setError('New password confirmation does not match.'); setOk(''); return }
    setSaving(true)
    setError('')
    setOk('')
    try {
      await changePassword(current, next)
      setOk('Your password has been updated. Please sign in again.')
      toast('Password updated. Please sign in again.')
      setCurrent('')
      setNext('')
      setConfirm('')
      window.setTimeout(() => onLogout(), 1200)
    } catch (err) {
      setError(failMessage(err, 'Could not update the password.'))
      setSaving(false)
    }
  }

  const field = 'mt-1 grid gap-2'

  return <Dialog open={open} onOpenChange={(value) => { if (!value) close() }}>
    <DialogContent className="admin-dialog-content">
      <DialogHeader>
        <DialogTitle>Change password</DialogTitle>
        <DialogDescription>Update the password used to sign in to this dashboard.</DialogDescription>
      </DialogHeader>
      {error && <p className="admin-login-error" role="alert"><AlertCircle size={15} />{error}</p>}
      {ok && <p className="admin-success" role="status"><CheckCircle2 size={15} />{ok}</p>}
      <div className="admin-dialog-body grid gap-4">
        <p className="admin-form-hint">Fields marked <span className="admin-required">*</span> are required.</p>
        <div className={field}><Label htmlFor="current-password">Current password <span className="admin-required">*</span></Label><PasswordInput id="current-password" className="w-full" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} /></div>
        <div className={field}><Label htmlFor="new-password">New password <span className="admin-required">*</span></Label><PasswordInput id="new-password" className="w-full" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} /></div>
        <div className={field}><Label htmlFor="confirm-password">Confirm new password <span className="admin-required">*</span></Label><PasswordInput id="confirm-password" className="w-full" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !saving) void submit() }} /></div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={close} disabled={saving}>Cancel</Button>
        <Button className="admin-primary" onClick={() => void submit()} disabled={saving}>{saving ? <Loader2 className="animate-spin" size={15} /> : <KeyRound size={15} />}Update password</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
}

function AdminUserMenu({ collapsed, displayName, avatar, onLogout }: { collapsed: boolean; displayName: string; avatar: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={menuRef} className="admin-user-menu">
      <button type="button" className="admin-user" aria-haspopup="menu" aria-expanded={open} aria-label="Account menu" title={collapsed ? 'Account menu' : undefined} onClick={() => setOpen((value) => !value)}>
        <Avatar><AvatarFallback>{avatar}</AvatarFallback></Avatar>
        {!collapsed && <span className="admin-user-copy"><span className="text-sm font-medium leading-tight">{displayName}</span><span className="admin-muted text-xs">Administrator</span></span>}
        {!collapsed && <LogOut className="ml-auto" />}
      </button>
      {open && (
        <div className="admin-user-dropdown" role="menu">
          <button type="button" role="menuitem" onClick={() => { setOpen(false); setPasswordOpen(true) }}><KeyRound size={15} />Change password</button>
          <button type="button" role="menuitem" onClick={() => { setOpen(false); onLogout() }}><LogOut size={15} />Logout</button>
        </div>
      )}
      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} onLogout={onLogout} />
    </div>
  )
}

function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getDashboardSummary()
      .then((data) => setSummary(data))
      .catch((err) => setError(failMessage(err, 'Could not load the dashboard summary.')))
  }, [])

  const value = (count: number | undefined) => (count === undefined ? '—' : String(count).padStart(2, '0'))

  return <>
    <PageTitle title={`${greeting()}, Admin`} description="Here is what is happening across your website today." />
    <Notice message={error} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <StatCard label="Total news" value={value(summary?.totalNews)} note="Articles on the public website" icon={FileText} />
      <StatCard label="Visa services" value={value(summary?.totalServices)} note="Services shown on the homepage" icon={FolderKanban} />
      <StatCard label="Gallery photos" value={value(summary?.totalGallery)} note="Photos in the public gallery" icon={GalleryHorizontalEnd} />
    </div>
  </>
}

function Services() {
  const { toast } = useToast()
  const [items, setItems] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [details, setDetails] = useState('')
  const [status, setStatus] = useState('ACTIVE')
  const [icon, setIcon] = useState('IdCard')
  const [formError, setFormError] = useState('')

  const load = async () => {
    try {
      setItems(await getAdminServices())
      setError('')
    } catch (err) {
      setError(failMessage(err, 'Could not load services.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const openCreate = () => {
    setEditingId(null)
    setTitle('')
    setSummary('')
    setDetails('')
    setStatus('ACTIVE')
    setIcon('IdCard')
    setFormError('')
    setOpen(true)
  }

  const openEdit = (item: Service) => {
    setEditingId(item.id)
    setTitle(item.title)
    setSummary(item.description)
    setDetails(item.details)
    setStatus(item.status)
    setIcon(item.icon || 'IdCard')
    setFormError('')
    setOpen(true)
  }

  const saveService = async () => {
    const richSummary = cleanRichText(summary)
    const richDetails = cleanRichText(details)
    if (!title.trim() || !richSummary || !richDetails) {
      setFormError('Please fill in the service title, summary, and details.')
      return
    }
    setFormError('')
    setSaving(true)
    try {
      const fields = { title: title.trim(), description: richSummary, details: richDetails, icon, status }
      if (editingId === null) await createService(fields)
      else await updateService(editingId, fields)
      setOpen(false)
      await load()
      toast(editingId === null ? 'Service added successfully' : 'Service updated successfully')
    } catch (err) {
      setError(failMessage(err, 'Could not save the service.'))
    } finally {
      setSaving(false)
    }
  }

  const removeService = async (item: Service) => {
    try {
      await deleteService(item.id)
      await load()
      toast('Service deleted successfully')
    } catch (err) {
      setError(failMessage(err, 'Could not delete the service.'))
    }
  }

  return <>
    <PageTitle title="Manage Services" description="Add and edit services displayed on the public website." action={<Button className="admin-primary" onClick={openCreate}><Plus data-icon="inline-start" /> Add service</Button>} />
    <Notice message={error} />
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="admin-dialog-content">
        <DialogHeader><DialogTitle>{editingId === null ? 'Add service' : 'Edit service'}</DialogTitle><DialogDescription>{editingId === null ? 'Create a new service to display on the website.' : 'Update the service information displayed on the website.'}</DialogDescription></DialogHeader>
        <div className="admin-dialog-body flex flex-col gap-4 py-3">
          <p className="admin-form-hint">Fields marked <span className="admin-required">*</span> are required.</p>
          {formError && <p className="admin-login-error" role="alert"><AlertCircle size={15} />{formError}</p>}
          <div className="flex flex-col gap-2"><Label htmlFor="service-title">Service title <span className="admin-required">*</span></Label><Input id="service-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Example: Visa Services" /></div>
          <div className="flex flex-col gap-2"><Label htmlFor="service-summary">Summary <span className="admin-required">*</span></Label><RichTextEditor id="service-summary" value={summary} onChange={setSummary} placeholder="Short service description shown on the homepage" minHeight={150} /></div>
          <div className="flex flex-col gap-2"><Label htmlFor="service-details">Details <span className="admin-required">*</span></Label><RichTextEditor id="service-details" value={details} onChange={setDetails} placeholder="Full details shown in the Learn more modal" minHeight={260} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2"><Label>Status</Label><Select value={status} onValueChange={(value) => value && setStatus(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ACTIVE">Active</SelectItem><SelectItem value="INACTIVE">Inactive</SelectItem></SelectContent></Select></div>
            <div className="flex flex-col gap-2"><Label>Icon</Label><Select value={icon} onValueChange={(value) => value && setIcon(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{serviceIconOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button className="admin-primary" onClick={() => void saveService()} disabled={saving}>{editingId === null ? 'Save service' : 'Save changes'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    <Card><CardContent className="pt-2"><Table><TableHeader><TableRow><TableHead>Service name</TableHead><TableHead>Description</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>
      {loading ? <TableRow><TableCell colSpan={4} className="admin-muted py-8 text-center">Loading services…</TableCell></TableRow>
        : items.length === 0 ? <TableRow><TableCell colSpan={4} className="admin-muted py-8 text-center">No services yet.</TableCell></TableRow>
        : items.map((item) => <TableRow key={item.id}><TableCell className="font-medium">{item.title}</TableCell><TableCell className="admin-muted max-w-md truncate">{stripHtml(item.description) || '—'}</TableCell><TableCell><Badge variant={item.status === 'ACTIVE' ? 'secondary' : 'outline'}>{statusLabel(item.status)}</Badge></TableCell><TableCell className="text-right"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" aria-label={`Edit ${item.title}`} onClick={() => openEdit(item)}><Pencil /></Button><ConfirmDelete label={item.title} onConfirm={() => void removeService(item)} /></div></TableCell></TableRow>)}
    </TableBody></Table></CardContent></Card>
  </>
}

function News() {
  const { toast } = useToast()
  const [items, setItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<NewsItem | null>(null)
  const [label, setLabel] = useState('IMMIGRATION')
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [details, setDetails] = useState('')
  const [category, setCategory] = useState('Company')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageName, setImageName] = useState('')
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [formError, setFormError] = useState('')

  const load = async () => {
    try {
      setItems(await getAdminNews())
      setError('')
    } catch (err) {
      setError(failMessage(err, 'Could not load news.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const openCreate = () => {
    setEditing(null)
    setLabel('IMMIGRATION')
    setTitle('')
    setSummary('')
    setDetails('')
    setCategory('Company')
    setImageFile(null)
    setImageName('')
    setFormError('')
    setOpen(true)
  }

  const editNews = (item: NewsItem) => {
    setEditing(item)
    setLabel(item.label)
    setTitle(item.title)
    setSummary(item.summary)
    setDetails(item.details)
    setCategory(item.category)
    setImageFile(null)
    setImageName('')
    setFormError('')
    setOpen(true)
  }

  const saveNews = async () => {
    const richSummary = cleanRichText(summary)
    const richDetails = cleanRichText(details)
    if (!title.trim() || !richSummary || !richDetails) {
      setFormError('Please fill in the article title, summary, and full details.')
      return
    }
    setFormError('')
    setSaving(true)
    try {
      const fields = {
        label: label.trim(),
        title: title.trim(),
        summary: richSummary,
        details: richDetails,
        category,
        date: editing ? editing.date : todayDisplay(),
        status: 'PUBLISHED',
      }
      if (editing) await updateNews(editing.id, fields, imageFile)
      else await createNews(fields, imageFile)
      setOpen(false)
      await load()
      toast(editing ? 'Article updated successfully' : 'Article published successfully')
    } catch (err) {
      setError(failMessage(err, 'Could not save the article.'))
    } finally {
      setSaving(false)
    }
  }

  const removeNews = async (item: NewsItem) => {
    try {
      await deleteNews(item.id)
      await load()
      toast('Article deleted successfully')
    } catch (err) {
      setError(failMessage(err, 'Could not delete the article.'))
    }
  }

  return (
    <>
      <PageTitle title="Manage News" description="Publish helpful updates and immigration insights for your clients." action={
        <Button className="admin-primary" onClick={openCreate}><Plus data-icon="inline-start" /> Add news</Button>
      } />
      <Notice message={error} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="admin-dialog-content">
          <DialogHeader><DialogTitle>{editing ? 'Edit news' : 'Add new news'}</DialogTitle><DialogDescription>{editing ? 'Update the article displayed on the public website.' : 'Create a new article for the public website.'}</DialogDescription></DialogHeader>
          <div className="admin-dialog-body flex flex-col gap-4 py-3">
            <p className="admin-form-hint">Fields marked <span className="admin-required">*</span> are required.</p>
            {formError && <p className="admin-login-error" role="alert"><AlertCircle size={15} />{formError}</p>}
            <div className="grid grid-cols-2 gap-4"><div className="flex flex-col gap-2"><Label htmlFor="news-label">Eyebrow label</Label><Input id="news-label" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="IMMIGRATION" /></div><div className="flex flex-col gap-2"><Label htmlFor="news-date">Display date</Label><Input id="news-date" readOnly value={editing ? editing.date : todayDisplay()} aria-describedby="news-date-hint" /><p id="news-date-hint" className="admin-muted text-xs">Filled in automatically.</p></div></div>
            <div className="flex flex-col gap-2"><Label htmlFor="news-title">Article title <span className="admin-required">*</span></Label><Input id="news-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Enter article title" /></div>
            <div className="flex flex-col gap-2"><Label htmlFor="news-summary">Summary <span className="admin-required">*</span></Label><RichTextEditor id="news-summary" value={summary} onChange={setSummary} placeholder="Short summary shown on the homepage" minHeight={150} /></div>
            <div className="flex flex-col gap-2"><Label htmlFor="news-details">Full details <span className="admin-required">*</span></Label><RichTextEditor id="news-details" value={details} onChange={setDetails} placeholder="Full article content shown after Read more" minHeight={300} /></div>
            <div className="flex flex-col gap-2"><Label>Category</Label><Select value={category} onValueChange={(value) => value && setCategory(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{newsCategories.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>
            <div className="flex flex-col gap-2"><Label htmlFor="news-image">Thumbnail</Label><input ref={imageInputRef} id="news-image" type="file" accept="image/*" className="sr-only" onChange={(event) => { const file = event.target.files?.[0] ?? null; setImageFile(file); setImageName(file ? file.name : ''); event.target.value = '' }} /><Button type="button" variant="outline" onClick={() => imageInputRef.current?.click()}><Upload data-icon="inline-start" /> {imageName || (editing ? 'Current image kept' : 'Upload image')}</Button></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button className="admin-primary" onClick={() => void saveNews()} disabled={saving}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Card><CardContent className="pt-2"><Table><TableHeader><TableRow><TableHead>Article title</TableHead><TableHead>Category</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>
        {loading ? <TableRow><TableCell colSpan={4} className="admin-muted py-8 text-center">Loading news…</TableCell></TableRow>
          : items.length === 0 ? <TableRow><TableCell colSpan={4} className="admin-muted py-8 text-center">No articles yet.</TableCell></TableRow>
          : items.map((item) => <TableRow key={item.id}><TableCell className="font-medium">{item.title}</TableCell><TableCell><Badge variant="outline">{item.category}</Badge></TableCell><TableCell className="admin-muted">{item.date}</TableCell><TableCell className="text-right"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" aria-label="Edit news" onClick={() => editNews(item)}><Pencil /></Button><ConfirmDelete label={item.title} onConfirm={() => void removeNews(item)} /></div></TableCell></TableRow>)}
      </TableBody></Table></CardContent></Card>
    </>
  )
}

function Gallery() {
  const { toast } = useToast()
  const [items, setItems] = useState<GalleryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<GalleryItem | null>(null)
  const [title, setTitle] = useState('')
  const [caption, setCaption] = useState('')
  const [category, setCategory] = useState('Team Activities')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageName, setImageName] = useState('')
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [formError, setFormError] = useState('')

  const load = async () => {
    try {
      setItems(await getAdminGallery())
      setError('')
    } catch (err) {
      setError(failMessage(err, 'Could not load gallery photos.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const openCreate = () => {
    setEditing(null)
    setTitle('')
    setCaption('')
    setCategory('Team Activities')
    setImageFile(null)
    setImageName('')
    setFormError('')
    setOpen(true)
  }

  const openEdit = (item: GalleryItem) => {
    setEditing(item)
    setTitle(item.title)
    setCaption(item.caption)
    setCategory(galleryCategories.includes(item.category) ? item.category : galleryCategories[0]!)
    setImageFile(null)
    setImageName('')
    setFormError('')
    setOpen(true)
  }

  const savePhoto = async () => {
    if (!title.trim() || !caption.trim()) {
      setFormError('Please fill in the photo title and caption.')
      return
    }
    if (!editing && !imageFile) {
      setFormError('Please choose a photo to upload.')
      return
    }
    setFormError('')
    setSaving(true)
    try {
      const fields = { title: title.trim(), caption: caption.trim(), category, status: 'ACTIVE' }
      if (editing) await updateGallery(editing.id, fields, imageFile)
      else await createGallery(fields, imageFile)
      setOpen(false)
      await load()
      toast(editing ? 'Photo updated successfully' : 'Photo uploaded successfully')
    } catch (err) {
      setError(failMessage(err, 'Could not save the photo.'))
    } finally {
      setSaving(false)
    }
  }

  const removePhoto = async (item: GalleryItem) => {
    try {
      await deleteGallery(item.id)
      await load()
      toast('Photo deleted successfully')
    } catch (err) {
      setError(failMessage(err, 'Could not delete the photo.'))
    }
  }

  return <>
    <PageTitle title="Manage Gallery" description="Showcase the people and moments behind your professional service." action={<Button className="admin-primary" onClick={openCreate}><Upload data-icon="inline-start" /> Upload new photo</Button>} />
    <Notice message={error} />
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="admin-dialog-content">
        <DialogHeader><DialogTitle>{editing ? 'Edit photo' : 'Upload new photo'}</DialogTitle><DialogDescription>{editing ? 'Update the photo details shown in the website gallery.' : 'Add an activity photo to display in the website gallery.'}</DialogDescription></DialogHeader>
        <div className="admin-dialog-body flex flex-col gap-4 py-3">
          <p className="admin-form-hint">Fields marked <span className="admin-required">*</span> are required.</p>
          {formError && <p className="admin-login-error" role="alert"><AlertCircle size={15} />{formError}</p>}
          <div className="flex flex-col gap-2"><Label htmlFor="gallery-title">Photo title <span className="admin-required">*</span></Label><Input id="gallery-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Example: Our workspace" /></div>
          <div className="flex flex-col gap-2"><Label htmlFor="gallery-caption">Caption <span className="admin-required">*</span></Label><Textarea id="gallery-caption" value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Caption shown with the photo on the homepage" /></div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="gallery-file">Photo file {!editing && <span className="admin-required">*</span>}</Label>
            <input ref={imageInputRef} id="gallery-file" type="file" accept="image/*" className="sr-only" onChange={(event) => { const file = event.target.files?.[0] ?? null; setImageFile(file); setImageName(file ? file.name : ''); event.target.value = '' }} />
            <Button type="button" variant="outline" onClick={() => imageInputRef.current?.click()}><Upload data-icon="inline-start" /> {imageName || (editing ? 'Current image kept' : 'Choose photo')}</Button>
            <p className="admin-muted text-xs">{editing && !imageName ? 'The current photo is kept unless you choose a new one.' : 'Choose an office, activity, or workplace photo.'}</p>
          </div>
          <div className="flex flex-col gap-2"><Label>Category</Label><Select value={category} onValueChange={(value) => value && setCategory(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{galleryCategories.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button className="admin-primary" onClick={() => void savePhoto()} disabled={saving}>{editing ? 'Save changes' : 'Save photo'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    {loading ? (
      <Card><CardContent className="admin-muted py-10 text-center">Loading gallery…</CardContent></Card>
    ) : items.length === 0 ? (
      <Card><CardContent className="admin-muted py-10 text-center">No photos yet.</CardContent></Card>
    ) : (
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{items.map((item) => <Card key={item.id} className="overflow-hidden"><div className="admin-gallery-image" style={{ backgroundImage: `url(${item.image_url})` }} /><CardContent className="flex items-center justify-between p-4"><div><p className="text-sm font-medium">{item.title}</p><p className="admin-muted mt-1 text-xs">{item.caption || item.category}</p></div><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" aria-label={`Edit ${item.title}`} onClick={() => openEdit(item)}><Pencil /></Button><ConfirmDelete label={item.title} onConfirm={() => void removePhoto(item)} /></div></CardContent></Card>)}</div>
    )}
  </>
}

export default function AdminPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState<AdminUser | null>(null)
  const [view, setView] = useState('dashboard')
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (!getToken()) {
      router.replace('/admin/login')
      return
    }
    setUser(getUser())
    setReady(true)
  }, [router])

  const logout = () => {
    clearSession()
    router.replace('/admin/login')
  }

  if (!ready) {
    return <div className="admin-shell"><main className="admin-main"><div className="admin-content"><p className="admin-muted">Loading dashboard…</p></div></main></div>
  }

  const active = navItems.find((item) => item.id === view) ?? navItems[0]!
  const content = view === 'dashboard' ? <Dashboard /> : view === 'services' ? <Services /> : view === 'news' ? <News /> : <Gallery />
  const displayName = user?.name ?? 'Admin Mandiri'
  const avatar = initials(displayName)

  return (
    <ToastProvider>
      <div className="admin-shell"><aside className={`admin-sidebar ${collapsed ? 'is-collapsed' : ''}`}><div className="admin-brand"><img className="admin-brand-logo" src="/images/fasqindo-logo-final.png" alt="PT. Fasqindo Mandiri Bersama" />{!collapsed && <span className="sr-only">Fasqindo Mandiri admin</span>}</div><div className="admin-sidebar-label">{!collapsed && 'Workspace'}</div><nav className="admin-nav" aria-label="Admin navigation">{navItems.map((item) => { const Icon = item.icon; return <button key={item.id} className={`admin-nav-item ${view === item.id ? 'is-active' : ''}`} onClick={() => setView(item.id)} title={collapsed ? item.label : undefined}><Icon />{!collapsed && <span>{item.label}</span>}</button> })}</nav><div className="mt-auto"><Separator className="mb-4" /><AdminUserMenu collapsed={collapsed} displayName={displayName} avatar={avatar} onLogout={logout} /></div></aside><div className={`admin-main ${collapsed ? 'is-expanded' : ''}`}><header className="admin-topbar"><div className="flex items-center gap-3"><Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{collapsed ? <ChevronRight /> : <ChevronLeft />}</Button><div><p className="admin-topbar-title">{active.label}</p><p className="admin-muted hidden text-xs sm:block">Manage your Fasqindo Mandiri Bersama website</p></div></div><div className="flex items-center gap-2"><Avatar className="size-8"><AvatarFallback>{avatar}</AvatarFallback></Avatar></div></header><main className="admin-content">{content}</main></div></div>
    </ToastProvider>
  )
}
