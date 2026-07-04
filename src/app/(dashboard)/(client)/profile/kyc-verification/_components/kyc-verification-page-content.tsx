'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import {
  authApi,
  type KycStatusResponse,
  type KycDocumentStatus,
  kycFileUrl,
} from '@/lib/api';
import { getFriendlyErrorMessage } from '@/lib/friendly-errors';
import { toast } from 'react-hot-toast';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, CheckCircle2, Upload, FileText } from 'lucide-react';
import { AuthenticatedDocumentViewer } from '@/components/authenticated-document-viewer';
import { type KycPhase } from '../_lib/kyc-files';

export function KycVerificationPageContent() {
  const { token } = useAuth();

  const [phase, setPhase] = useState<KycPhase>('draft');

  // Document types
  const [poiType, setPoiType] = useState('');
  const [poaType, setPoaType] = useState('');
  const [otherType, setOtherType] = useState('');

  // Handler to prevent scroll to top when selecting dropdown options
  const handleOtherTypeChange = (value: string) => {
    // Store current scroll position
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    setOtherType(value);
    // Restore scroll position after state update (using double RAF for reliability)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo(scrollX, scrollY);
      });
    });
  };

  // Files
  const [poiFrontFile, setPoiFrontFile] = useState<File | null>(null);
  const [poaFrontFile, setPoaFrontFile] = useState<File | null>(null);
  const [poaBackFile, setPoaBackFile] = useState<File | null>(null);
  const [otherFile, setOtherFile] = useState<File | null>(null);

  const [uploading, setUploading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [kycStatusData, setKycStatusData] = useState<KycStatusResponse['data'] | null>(null);

  // Per-field re-upload stash for rejected docs: key = backend field name
  const [reuploadFiles, setReuploadFiles] = useState<Record<string, File | null>>({});
  const [reuploadingKey, setReuploadingKey] = useState<string | null>(null);

  const requiredSelectedCount = [poiFrontFile, poaFrontFile, poaBackFile].filter(Boolean).length;
  const hasOptionalOtherSelection = Boolean(otherFile || otherType);
  const isOptionalOtherComplete = !hasOptionalOtherSelection || Boolean(otherFile && otherType);
  const progress = useMemo(
    () =>
      phase === 'approved' || phase === 'under_review'
        ? 100
        : (requiredSelectedCount / 3) * 100,
    [requiredSelectedCount, phase]
  );

  const validateImage = (f: File | null) => {
    if (!f) return true;
    const okType =
      f.type === 'image/jpeg' ||
      f.type === 'image/jpg' ||
      f.type === 'image/png' ||
      f.type === 'application/pdf' ||
      f.name.toLowerCase().endsWith('.jpg') ||
      f.name.toLowerCase().endsWith('.jpeg') ||
      f.name.toLowerCase().endsWith('.png') ||
      f.name.toLowerCase().endsWith('.pdf');

    if (!okType) {
      toast.error('Only JPG, PNG, and PDF files are accepted.');
      return false;
    }
    const maxBytes = 15 * 1024 * 1024;
    if (f.size > maxBytes) {
      toast.error('Each file must be 15MB or less.');
      return false;
    }
    return true;
  };

  const pick =
    (setter: (f: File | null) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Store current scroll position
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;
      const f = e.target.files?.[0] ?? null;
      if (!validateImage(f)) {
        e.target.value = '';
        return;
      }
      setter(f);
      // Restore scroll position after state update (using double RAF for reliability)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo(scrollX, scrollY);
        });
      });
    };

  const canSubmit =
    phase === 'draft' &&
    !!(poiFrontFile && poaFrontFile && poaBackFile) &&
    !!(poiType && poaType) &&
    isOptionalOtherComplete;

  const submitKycDocuments = async () => {
    if (!token) {
      toast.error('Please sign in again to continue.');
      return;
    }
    if (!canSubmit) {
      toast.error('Please upload POI and POA documents with their document types. Other documents are optional.');
      return;
    }
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('poi_front_file', poiFrontFile!);
      fd.append('poa_front_file', poaFrontFile!);
      fd.append('poa_back_file', poaBackFile!);
      if (otherFile) {
        fd.append('other_file', otherFile);
      }

      const res = await authApi.uploadProfileDocuments(fd, token);
      toast.success(res?.message || 'User document uploaded successfully');

      const next =
        (String(res?.verification_status || '').toLowerCase() as KycPhase) ||
        ('under_review' as KycPhase);
      setPhase(next === 'approved' ? 'approved' : 'under_review');

      // clear inputs
      resetAll();

      await loadKycStatus();
    } catch (err: unknown) {
      toast.error(getFriendlyErrorMessage(err, {
        audience: 'client',
        resource: 'KYC documents',
        action: 'submit',
      }));
    } finally {
      setUploading(false);
    }
  };

  const reuploadSingle = async (fieldKey: string) => {
    const f = reuploadFiles[fieldKey];
    if (!token) return toast.error('Please sign in again to continue.');
    if (!f) return toast.error('Please choose a file to upload.');
    if (!validateImage(f)) return;

    try {
      setReuploadingKey(fieldKey);
      const fd = new FormData();
      // Send only the rejected document’s field
      fd.append(fieldKey, f);
      const res = await authApi.uploadProfileDocuments(fd, token);
      toast.success(res?.message || 'Document re-uploaded successfully');
      setReuploadFiles((s) => ({ ...s, [fieldKey]: null }));
      await loadKycStatus();
    } catch (e: unknown) {
      toast.error(getFriendlyErrorMessage(e, {
        audience: 'client',
        resource: 'KYC document',
        action: 'submit',
      }));
    } finally {
      setReuploadingKey(null);
    }
  };

  const loadKycStatus = async () => {
    if (!token) return;
    try {
      setStatusLoading(true);
      const res = await authApi.getProfileDocumentsStatus(token);
      setKycStatusData(res.data);
      const status = res.data.kyc.status?.toLowerCase();
      // Check if KYC is approved (status can be 'approved', 'verified', 'full-verified', or check approved flag)
      if (status === 'approved' || status === 'verified' || status === 'full-verified' || res.data.kyc.approved) {
        setPhase('approved');
      } else if (status === 'pending' || status === 'under_review' || status === 'review') {
        if (res.data.kyc.documents_submitted) {
          setPhase('under_review');
        } else {
          setPhase('draft');
        }
      } else if (status === 'rejected') {
        // Even if rejected, if documents are submitted, show under_review to allow re-upload
        setPhase(res.data.kyc.documents_submitted ? 'under_review' : 'draft');
      } else {
        // treat unknown as draft unless documents_submitted tells otherwise
        setPhase(res.data.kyc.documents_submitted ? 'under_review' : 'draft');
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error(getFriendlyErrorMessage(err, {
        audience: 'client',
        resource: 'KYC status',
        action: 'load',
      }));
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    loadKycStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const renderFilePreview = (label: string, fileUrl?: string | null, fileName?: string | null) => {
    const url = fileUrl || (fileName ? kycFileUrl(fileName) : null);
    if (!url) return null;
    return (
      <div className="mt-2">
        <AuthenticatedDocumentViewer
          src={url}
          fileName={fileName || url}
          label={label}
          mode="embedded"
          previewClassName="h-40 w-full"
          dialogClassName="max-w-6xl"
        />
      </div>
    );
  };

  const renderDocumentStatus = (
    title: string,
    fieldKey: string,
    data?: KycDocumentStatus
  ) => {
    if (!data || data.status === 'not_submitted') return null;
    const badgeVariant =
      data.status === 'approved'
        ? 'success'
        : data.status === 'rejected'
        ? 'destructive'
        : 'secondary';

    const onPickRejected =
      (k: string) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0] ?? null;
        if (!validateImage(f)) {
          e.target.value = '';
          return;
        }
        setReuploadFiles((s) => ({ ...s, [k]: f }));
      };

    const currentPicked = reuploadFiles[fieldKey] ?? null;

    const isApproved = kycStatusData?.kyc.approved ||
      kycStatusData?.kyc.status?.toLowerCase() === 'approved' ||
      kycStatusData?.kyc.status?.toLowerCase() === 'verified' ||
      kycStatusData?.kyc.status?.toLowerCase() === 'full-verified';

    return (
      <Card key={title} className="bg-card border-border">
        <CardContent className="py-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">{title}</h4>
            <Badge
              variant={badgeVariant === 'success' ? 'default' : badgeVariant}
              className={
                badgeVariant === 'success'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : badgeVariant === 'destructive'
                  ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300'
                  : 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200'
              }
            >
              {data.status.toUpperCase()}
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground">
            {data.uploaded ? 'File uploaded' : 'File not uploaded'}
          </p>

          {/* Preview of currently uploaded file (if any) */}
          {(data.url || data.file) && renderFilePreview(title, data.url, data.file)}

          {/* Rejection comment */}
          {data.rejection_comment && (
            <div className="text-xs text-destructive border border-destructive/20 rounded-md p-2 bg-destructive/10">
              {data.rejection_comment}
            </div>
          )}

          {/* Allow re-upload for submitted documents - but NOT when overall KYC is approved or individual doc is approved */}
          {!isApproved && data.status !== 'not_submitted' && data.status !== 'approved' && (
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-3">
                <label htmlFor={`reupload-${fieldKey}`}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById(`reupload-${fieldKey}`)?.click()}
                    disabled={reuploadingKey === fieldKey}
                  >
                    Choose File
                  </Button>
                </label>
                <Input
                  id={`reupload-${fieldKey}`}
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                  className="hidden"
                  onChange={onPickRejected(fieldKey)}
                  disabled={reuploadingKey === fieldKey}
                />
                <Button
                  onClick={() => reuploadSingle(fieldKey)}
                  disabled={!currentPicked || reuploadingKey === fieldKey}
                >
                  {reuploadingKey === fieldKey ? 'Uploading…' : data.status === 'rejected' ? 'Re-upload' : 'Upload'}
                </Button>
              </div>

              {/* Selected file name + size before re-upload */}
              {currentPicked && (
                <div className="text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span className="truncate max-w-[220px]">{currentPicked.name}</span>
                    <span>• {(currentPicked.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const resetAll = () => {
    setPoiFrontFile(null);
    setPoaFrontFile(null);
    setPoaBackFile(null);
    setOtherFile(null);
    setPoiType('');
    setPoaType('');
    setOtherType('');
  };

  // Header status pill – visible only after first submission
  const StatusPill = () => {
    const isApproved = kycStatusData?.kyc.approved || 
                       kycStatusData?.kyc.status?.toLowerCase() === 'approved' ||
                       kycStatusData?.kyc.status?.toLowerCase() === 'verified' ||
                       kycStatusData?.kyc.status?.toLowerCase() === 'full-verified';
    
    const isUnderReview = kycStatusData?.kyc.status?.toLowerCase() === 'pending' ||
                          kycStatusData?.kyc.status?.toLowerCase() === 'under_review' ||
                          kycStatusData?.kyc.status?.toLowerCase() === 'review';
    
    return isApproved ? (
      <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/40">
        <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-700 dark:text-emerald-300" />
        Verified
      </Badge>
    ) : isUnderReview ? (
      <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/40">
        <AlertCircle className="h-3.5 w-3.5 mr-1 text-amber-700 dark:text-amber-300" />
        Under Review
      </Badge>
    ) : null;
  };

  // ---------- Upload Card Sections ----------
  const UploadSection = (props: {
    title: string;
    description: string;
    selectValue: string;
    onSelectChange: (value: string) => void;
    selectOptions: { value: string; label: string }[];
    selectPlaceholder: string;
    file: File | null;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    note: string;
    disabled?: boolean;
  }) => {
    const {
      title,
      description,
      selectValue,
      onSelectChange,
      selectOptions,
      selectPlaceholder,
      file,
      onChange,
      note,
      disabled,
    } = props;

    return (
      <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold text-foreground">
            {title}
          </Label>
          <div className="mt-3">
            <Select
              value={selectValue}
              onValueChange={onSelectChange}
              disabled={disabled}
            >
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder={selectPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {selectOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-medium text-card-foreground">
              {description}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="border-2 border-dashed border-border rounded-lg p-8 bg-muted/50"
              onClick={(e) => {
                if (!selectValue) {
                  e.stopPropagation();
                  toast.error('Please select a document type from the dropdown first.');
                }
              }}
            >
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="relative">
                  <div className="w-16 h-20 bg-primary/10 rounded-lg flex items-center justify-center">
                    <FileText className="w-8 h-8 text-primary" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                      />
                    </svg>
                  </div>
                </div>

                {file ? (
                  <div className="w-full">
                    <div className="flex items-center justify-center gap-2 text-sm font-medium text-foreground mb-2">
                      <FileText className="w-4 h-4" />
                      <span className="truncate max-w-xs">{file.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-foreground font-medium">
                      Drop your file here
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-sm text-muted-foreground">Or</span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  </>
                )}

                <label htmlFor={`file-${title}`}>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={disabled || !selectValue}
                    onClick={() => document.getElementById(`file-${title}`)?.click()}
                  >
                    Browse Files
                  </Button>
                </label>
                <Input
                  id={`file-${title}`}
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                  className="hidden"
                  onChange={onChange}
                  disabled={disabled || !selectValue}
                />

                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p>Document Format: JPG, PNG, PDF & 15MB maximum size of the document allowed</p>
                </div>
              </div>
            </div>

            <Card className="mt-4 bg-muted/50 border-border">
              <CardContent className="pt-4">
                <p className="text-sm font-semibold text-foreground mb-1">
                  Note:
                </p>
                <p className="text-sm text-muted-foreground">{note}</p>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    );
  };

  const DualUploadSection = (props: {
    title: string;
    description: string;
    selectValue: string;
    onSelectChange: (value: string) => void;
    selectOptions: { value: string; label: string }[];
    selectPlaceholder: string;
    frontFile: File | null;
    backFile: File | null;
    onFrontChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBackChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    note: string;
    disabled?: boolean;
  }) => {
    const {
      title,
      description,
      selectValue,
      onSelectChange,
      selectOptions,
      selectPlaceholder,
      frontFile,
      backFile,
      onFrontChange,
      onBackChange,
      note,
      disabled,
    } = props;

    return (
      <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold text-foreground">
            {title}
          </Label>
          <div className="mt-3">
            <Select
              value={selectValue}
              onValueChange={onSelectChange}
              disabled={disabled}
            >
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder={selectPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {selectOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Front Side */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-medium text-card-foreground">
                {description} - Front
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="border-2 border-dashed border-border rounded-lg p-6 bg-muted/50"
                onClick={(e) => {
                  if (!selectValue) {
                    e.stopPropagation();
                    toast.error('Please select a document type from the dropdown first.');
                  }
                }}
              >
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="relative">
                    <div className="w-12 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                        />
                      </svg>
                    </div>
                  </div>

                  {frontFile ? (
                    <div className="w-full text-center">
                      <p className="text-sm font-medium text-foreground truncate">
                        {frontFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(frontFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-foreground font-medium">
                        Drop your file here
                      </p>
                      <div className="flex items-center gap-2 w-full">
                        <div className="h-px flex-1 bg-border" />
                        <span className="text-xs text-muted-foreground">Or</span>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                    </>
                  )}

                  <label htmlFor={`file-front-${title}`}>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={disabled || !selectValue}
                      onClick={() => document.getElementById(`file-front-${title}`)?.click()}
                    >
                      Browse Files
                    </Button>
                  </label>
                  <Input
                    id={`file-front-${title}`}
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                    className="hidden"
                    onChange={onFrontChange}
                    disabled={disabled || !selectValue}
                  />

                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <p className="text-left">Document Format: JPG, PNG, PDF & 15MB maximum</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Back Side */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-medium text-card-foreground">
                {description} - Back
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="border-2 border-dashed border-border rounded-lg p-6 bg-muted/50"
                onClick={(e) => {
                  if (!selectValue) {
                    e.stopPropagation();
                    toast.error('Please select a document type from the dropdown first.');
                  }
                }}
              >
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="relative">
                    <div className="w-12 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                        />
                      </svg>
                    </div>
                  </div>

                  {backFile ? (
                    <div className="w-full text-center">
                      <p className="text-sm font-medium text-foreground truncate">
                        {backFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(backFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-foreground font-medium">
                        Drop your file here
                      </p>
                      <div className="flex items-center gap-2 w-full">
                        <div className="h-px flex-1 bg-border" />
                        <span className="text-xs text-muted-foreground">Or</span>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                    </>
                  )}

                  <label htmlFor={`file-back-${title}`}>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={disabled || !selectValue}
                      onClick={() => document.getElementById(`file-back-${title}`)?.click()}
                    >
                      Browse Files
                    </Button>
                  </label>
                  <Input
                    id={`file-back-${title}`}
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                    className="hidden"
                    onChange={onBackChange}
                    disabled={disabled || !selectValue}
                  />

                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <p className="text-left">Document Format: JPG, PNG, PDF & 15MB maximum</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-muted/50 border-border">
          <CardContent className="pt-4">
            <p className="text-sm font-semibold text-foreground mb-1">Note:</p>
            <p className="text-sm text-muted-foreground">{note}</p>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Single switch to enforce "only one UI at a time"
  const documentsSubmitted = Boolean(kycStatusData?.kyc.documents_submitted);
  const showStatusUI = documentsSubmitted;      // AFTER submission -> show status
  const showUploadUI = !documentsSubmitted;     // BEFORE submission -> show upload

  return (
    <>
      <div className="max-w-full mx-auto">
        <Card className="overflow-hidden bg-card border-border shadow-sm">
          <div className="px-6 py-5 border-b border-border bg-gradient-to-r from-primary/5 to-primary/10">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <CardTitle className="text-xl">Document Upload for KYC</CardTitle>
                  {showStatusUI && <StatusPill />}
                </div>
                <CardDescription className="mt-1.5">
                  {showUploadUI
                    ? 'Upload your documents for identity verification. Once submitted, an admin will review your application.'
                    : kycStatusData && (kycStatusData.kyc.approved || 
                        kycStatusData.kyc.status?.toLowerCase() === 'approved' ||
                        kycStatusData.kyc.status?.toLowerCase() === 'verified' ||
                        kycStatusData.kyc.status?.toLowerCase() === 'full-verified')
                    ? 'Your KYC has been approved. All documents have been verified successfully.'
                    : 'Your KYC submission is being reviewed. Track the status of each document below.'}
                </CardDescription>
              </div>
              <div className="hidden sm:block">
                <Progress value={progress} className="h-2 w-48" />
              </div>
            </div>
          </div>

          <CardContent className="space-y-8 pt-6">
            {/* ======== STATUS UI (ONLY AFTER SUBMISSION) ======== */}
            {showStatusUI && (
              <>
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">KYC Status</h3>
                      <p className="text-sm text-muted-foreground">
                        {kycStatusData && (kycStatusData.kyc.approved || 
                          kycStatusData.kyc.status?.toLowerCase() === 'approved' ||
                          kycStatusData.kyc.status?.toLowerCase() === 'verified' ||
                          kycStatusData.kyc.status?.toLowerCase() === 'full-verified')
                          ? 'All submitted documents have been approved. Your KYC is verified.'
                          : 'Keep track of the review progress for each document.'}
                      </p>
                    </div>
                    {kycStatusData && (
                      <Badge
                        className={
                          kycStatusData.kyc.approved ||
                          kycStatusData.kyc.status?.toLowerCase() === 'approved' ||
                          kycStatusData.kyc.status?.toLowerCase() === 'verified' ||
                          kycStatusData.kyc.status?.toLowerCase() === 'full-verified'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : kycStatusData.kyc.status?.toLowerCase() === 'rejected'
                            ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300'
                            : 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200'
                        }
                      >
                        {kycStatusData.kyc.approved || 
                         kycStatusData.kyc.status?.toLowerCase() === 'full-verified'
                          ? 'APPROVED'
                          : kycStatusData.kyc.status?.toUpperCase() || 'PENDING'}
                      </Badge>
                    )}
                  </div>

                  {statusLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <span className="text-sm text-muted-foreground">Loading status…</span>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {renderDocumentStatus('POI (Front)', 'poi_front_file', kycStatusData?.documents.poi_front_file)}
                      {renderDocumentStatus('POA (Front)', 'poa_front_file', kycStatusData?.documents.poa_front_file)}
                      {renderDocumentStatus('POA (Back)', 'poa_back_file', kycStatusData?.documents.poa_back_file)}
                      {renderDocumentStatus('Other Document', 'other_file', kycStatusData?.documents.other_file)}
                    </div>
                  )}
                </section>

                {kycStatusData && (kycStatusData.kyc.approved || 
                  kycStatusData.kyc.status?.toLowerCase() === 'approved' ||
                  kycStatusData.kyc.status?.toLowerCase() === 'verified' ||
                  kycStatusData.kyc.status?.toLowerCase() === 'full-verified') && (
                  <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/40 p-4 bg-emerald-50 dark:bg-emerald-950/30">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-700 dark:text-emerald-300 mt-0.5 flex-shrink-0" />
                      <div className="space-y-1">
                        <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                          KYC verified successfully
                        </p>
                        <p className="text-sm text-emerald-800 dark:text-emerald-300">
                          Your identity has been verified. All submitted documents have been approved. You&apos;re all set!
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {kycStatusData && 
                 !kycStatusData.kyc.approved &&
                 kycStatusData.kyc.status?.toLowerCase() !== 'approved' &&
                 kycStatusData.kyc.status?.toLowerCase() !== 'verified' &&
                 kycStatusData.kyc.status?.toLowerCase() !== 'full-verified' &&
                 (kycStatusData.kyc.status?.toLowerCase() === 'pending' || 
                  kycStatusData.kyc.status?.toLowerCase() === 'under_review' ||
                  kycStatusData.kyc.status?.toLowerCase() === 'review') && (
                  <div className="rounded-lg border border-amber-200 dark:border-amber-900/40 p-4 bg-amber-50 dark:bg-amber-950/30">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-700 dark:text-amber-300 mt-0.5 flex-shrink-0" />
                      <div className="space-y-1">
                        <p className="font-semibold text-amber-900 dark:text-amber-200">
                          Your KYC is under review
                        </p>
                        <p className="text-sm text-amber-800 dark:text-amber-300">
                          Thanks for submitting your documents. Please wait{' '}
                          <span className="font-medium">1–2 days</span> for approval.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ======== UPLOAD UI (ONLY BEFORE SUBMISSION) ======== */}
            {showUploadUI && (
              <>
                <UploadSection
                  title="Proof of Identification (POI)"
                  description={
                    poiType 
                      ? (
                          [ 
                            { value: 'aadhaar_card', label: 'Aadhaar Card' },
                            { value: 'driving_licence', label: 'Driving Licence' },
                            { value: 'passport', label: 'Passport' },
                            { value: 'pan_card', label: 'PAN Card' },
                            { value: 'voter_id', label: 'Voter ID' },
                          ].find((opt) => opt.value === poiType)?.label ?? 'Proof of Identification'
                        )
                      : 'Proof of Identification'
                  }
                  selectValue={poiType}
                  onSelectChange={setPoiType}
                  selectOptions={[
                    { value: 'aadhaar_card', label: 'Aadhaar Card' },
                    { value: 'driving_licence', label: 'Driving Licence' },
                    { value: 'passport', label: 'Passport' },
                    { value: 'pan_card', label: 'PAN Card' },
                    { value: 'voter_id', label: 'Voter ID' },
                  ]}
                  selectPlaceholder="Select Option"
                  file={poiFrontFile}
                  onChange={pick(setPoiFrontFile)}
                  note="Upload a clear colour copy of the front side of your identification document."
                  disabled={phase !== 'draft'}
                />

                <DualUploadSection
                  title="Proof of Address (POA)"
                  description={
                    poaType
                      ? (
                          [
                             { value: 'aadhaar_card', label: 'Aadhaar Card' },
                             { value: 'driving_licence', label: 'Driving Licence' },
                             { value: 'passport', label: 'Passport' },
                             { value: 'voter_id', label: 'Voter ID' },
                             { value: 'bank_statement', label: 'Bank Statement' },
                             { value: 'utility_bill', label: 'Utility Bill' },
                          ].find((opt) => opt.value === poaType)?.label ?? 'Proof of Address Document'
                        )
                      : 'Proof of Address Document'
                  }
                  selectValue={poaType}
                  onSelectChange={setPoaType}
                  selectOptions={[
                    { value: 'aadhaar_card', label: 'Aadhaar Card' },
                    { value: 'driving_licence', label: 'Driving Licence' },
                    { value: 'passport', label: 'Passport' },
                    { value: 'voter_id', label: 'Voter ID' },
                    { value: 'bank_statement', label: 'Bank Statement' },
                    { value: 'utility_bill', label: 'Utility Bill' },
                    { value: 'local_authority_bill', label: 'Local Authority Bill' },
                    { value: 'official_document', label: 'Any other Official Document' },
                  ]}
                  selectPlaceholder="Select Option"
                  frontFile={poaFrontFile}
                  backFile={poaBackFile}
                  onFrontChange={pick(setPoaFrontFile)}
                  onBackChange={pick(setPoaBackFile)}
                  note="Upload both sides of the document. Ensure the document is recent (last 3 months) and clearly legible."
                  disabled={phase !== 'draft'}
                />

                <UploadSection
                  title="Other Documents (Optional)"
                  description={
                    otherType
                      ? (
                          (
                            [
                              { value: 'tax_document', label: 'Tax Document' },
                              { value: 'employment_letter', label: 'Employment Letter' },
                              { value: 'additional_id', label: 'Additional ID' },
                              { value: 'other', label: 'Other Supporting Document' },
                            ].find(opt => opt.value === otherType)?.label
                          ) || 'Other Supporting Document'
                        )
                      : "Other Documents"
                  }
                  selectValue={otherType}
                  onSelectChange={handleOtherTypeChange}
                  selectOptions={[
                    { value: 'tax_document', label: 'Tax Document' },
                    { value: 'employment_letter', label: 'Employment Letter' },
                    { value: 'additional_id', label: 'Additional ID' },
                    { value: 'other', label: 'Other Supporting Document' },
                  ]}
                  selectPlaceholder="Select Option"
                  file={otherFile}
                  onChange={pick(setOtherFile)}
                  note="Please note that the Maximum document upload size is 15 MB. This section is optional unless otherwise requested."
                  disabled={phase !== 'draft'}
                />
              </>
            )}
          </CardContent>

          {/* Footer: visible ONLY in upload flow */}
          {showUploadUI && (
            <CardFooter className="flex justify-end gap-3 border-t border-border px-6 py-4 bg-muted/30">
              <Button
                variant="outline"
                onClick={resetAll}
                disabled={phase !== 'draft' || uploading}
              >
                Reset All
              </Button>
              <Button
                onClick={submitKycDocuments}
                disabled={!canSubmit || uploading}
              >
                {uploading ? (
                  <>
                    <Upload className="mr-2 h-4 w-4 animate-pulse" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Submit Documents
                  </>
                )}
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>

    </>
  );
}
