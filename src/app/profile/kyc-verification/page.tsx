'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/auth-context';
import { authApi } from '@/lib/api';

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
import { AlertCircle, CheckCircle2, Image as ImageIcon, Upload } from 'lucide-react';
import { MainLayout } from '@/components/main-layout';

type KycPhase = 'draft' | 'under_review' | 'approved';

export default function KycVerificationPage() {
  const { token } = useAuth();

  const [phase, setPhase] = useState<KycPhase>('draft');
  const [poiFrontFile, setPoiFrontFile] = useState<File | null>(null);
  const [poaFrontFile, setPoaFrontFile] = useState<File | null>(null);
  const [poaBackFile, setPoaBackFile] = useState<File | null>(null);
  const [otherFile, setOtherFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const selectedCount = [poiFrontFile, poaFrontFile, poaBackFile, otherFile].filter(Boolean).length;
  const progress = useMemo(
    () =>
      phase === 'approved' || phase === 'under_review'
        ? 100
        : (selectedCount / 4) * 100,
    [selectedCount, phase]
  );

  const validateImage = (f: File | null) => {
    if (!f) return true;
    const okType =
      f.type === 'image/jpeg' ||
      f.type === 'image/jpg' ||
      f.type === 'image/png' ||
      f.name.toLowerCase().endsWith('.jpg') ||
      f.name.toLowerCase().endsWith('.jpeg') ||
      f.name.toLowerCase().endsWith('.png');
    if (!okType) {
      toast.error('Only JPG and PNG files are accepted.');
      return false;
    }
    const maxBytes = 5 * 1024 * 1024;
    if (f.size > maxBytes) {
      toast.error('Each file must be ≤ 5MB.');
      return false;
    }
    return true;
  };

  const pick =
    (setter: (f: File | null) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0] ?? null;
      if (!validateImage(f)) {
        e.target.value = '';
        return;
      }
      setter(f);
    };

  const canSubmit =
    phase === 'draft' &&
    !!(poiFrontFile && poaFrontFile && poaBackFile && otherFile);

  const submitKycDocuments = async () => {
    if (!token) {
      toast.error('Not authenticated.');
      return;
    }
    if (!canSubmit) {
      toast.error('Please select all required documents.');
      return;
    }
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('poi_front_file', poiFrontFile!);
      fd.append('poa_front_file', poaFrontFile!);
      fd.append('poa_back_file', poaBackFile!);
      fd.append('other_file', otherFile!);

      const res = await authApi.uploadProfileDocuments(fd, token);
      toast.success(res?.message || 'User document uploaded successfully');

      const next =
        (String(res?.verification_status || '').toLowerCase() as KycPhase) ||
        ('under_review' as KycPhase);
      setPhase(next === 'approved' ? 'approved' : 'under_review');

      // clear inputs
      setPoiFrontFile(null);
      setPoaFrontFile(null);
      setPoaBackFile(null);
      setOtherFile(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to upload documents');
    } finally {
      setUploading(false);
    }
  };

  const StatusPill = () =>
    phase === 'approved' ? (
      <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/40">
        <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-700 dark:text-emerald-300" />
        Verified
      </Badge>
    ) : phase === 'under_review' ? (
      <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/40">
        <AlertCircle className="h-3.5 w-3.5 mr-1 text-amber-700 dark:text-amber-300" />
        Under Review
      </Badge>
    ) : (
      <Badge variant="outline">Draft</Badge>
    );

  const UploadRow = (props: {
    label: string;
    hint: string;
    file: File | null;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onClear: () => void;
    disabled?: boolean;
  }) => {
    const { label, hint, file, onChange, onClear, disabled } = props;
    return (
      
      <div className={`rounded-lg border p-4 ${disabled ? 'opacity-60' : ''}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <Label className="text-sm font-medium">{label}</Label>
            <p className="text-xs text-muted-foreground mt-1">{hint}</p>
          </div>
          <div className="flex items-center gap-2">
            {file && (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={onClear}
                disabled={disabled}
              >
                Clear
              </Button>
            )}
            <div className="relative">
              <Input
                type="file"
                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                className="max-w-xs"
                onChange={onChange}
                disabled={disabled}
              />
            </div>
          </div>
        </div>

        <div className="mt-3">
          {file ? (
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-2">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium truncate">{file.name}</span>
              <span className="text-xs text-muted-foreground ml-auto">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">No file chosen yet</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <MainLayout>
    <Card className="overflow-hidden">
      <div className="px-6 py-5 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>KYC Verification</CardTitle>
              <StatusPill />
            </div>
            <CardDescription className="mt-1">
              Upload your documents for identity verification. Once submitted, an
              admin will review your application.
            </CardDescription>
          </div>
          <div className="hidden sm:block">
            <Progress value={progress} className="h-2 w-48" />
          </div>
        </div>
      </div>

      <CardContent className="space-y-6 pt-6">
        {phase === 'under_review' && (
          <div className="rounded-md border p-4 border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-700 dark:text-amber-300 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium">Your KYC is under review</p>
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  Thanks for submitting your documents. Please wait{' '}
                  <span className="font-medium">1–2 days</span> for approval.
                </p>
              </div>
            </div>
          </div>
        )}

        {phase === 'approved' && (
          <div className="rounded-md border p-4 border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-700 dark:text-emerald-300 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium">KYC verified successfully</p>
                <p className="text-sm text-emerald-800 dark:text-emerald-300">
                  Your identity has been verified. You’re all set!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Upload Rows */}
        <UploadRow
          label="Government-issued ID (Front)"
          hint="Passport, Driver’s License, or National ID (front side)"
          file={poiFrontFile}
          onChange={pick(setPoiFrontFile)}
          onClear={() => setPoiFrontFile(null)}
          disabled={phase !== 'draft'}
        />

        <UploadRow
          label="Proof of Address (Front)"
          hint="Utility bill / bank statement (front side)"
          file={poaFrontFile}
          onChange={pick(setPoaFrontFile)}
          onClear={() => setPoaFrontFile(null)}
          disabled={phase !== 'draft'}
        />

        <UploadRow
          label="Proof of Address (Back)"
          hint="Back side of the same document if applicable"
          file={poaBackFile}
          onChange={pick(setPoaBackFile)}
          onClear={() => setPoaBackFile(null)}
          disabled={phase !== 'draft'}
        />

        <UploadRow
          label="Other Supporting Document"
          hint="Any additional ID or verification proof"
          file={otherFile}
          onChange={pick(setOtherFile)}
          onClear={() => setOtherFile(null)}
          disabled={phase !== 'draft'}
        />

        <div className="rounded-lg p-4 bg-muted/30">
          <h4 className="mb-2 font-medium">Why we need these documents?</h4>
          <p className="text-sm text-muted-foreground">
            We require these documents to verify your identity and comply with
            KYC regulations. Your information is securely stored and encrypted.
          </p>
        </div>
      </CardContent>

      <CardFooter className="flex justify-end gap-2 border-t px-6 py-4">
        <Button onClick={submitKycDocuments} disabled={!canSubmit || uploading}>
          {uploading ? (
            <>
              <Upload className="mr-2 h-4 w-4 animate-pulse" />
              Uploading…
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Submit for Review
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
    </MainLayout>
  );
}