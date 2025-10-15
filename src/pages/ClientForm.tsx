// src/pages/ClientForm.tsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { useForm, FormProvider, useFormContext } from "react-hook-form";
import { useDebounce } from 'use-debounce';
import { useQuery, useMutation } from "@tanstack/react-query";
import jsPDF from 'jspdf';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, PartyPopper, Download } from "lucide-react";
import type { Questionnaire, Question as QuestionType, Section as SectionType } from "@/types";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";

// --- MOCK DATA FOR DEMO PAGE ---
const mockDemoQuestionnaire: Questionnaire = {
    id: 'demo',
    title: 'Sample: AI Readiness Assessment',
    organization: 'Innovate Corp (Demo)',
    status: 'published',
    updated_at: new Date().toISOString(),
    owner: 'Intersect AI',
    responses: 0,
    completionRate: 0,
    lastEdited: 'now',
    sections: [
        { id: 'demo-sec-1', title: 'Strategic Vision', description: 'Help us understand your high-level goals for incorporating AI into your business.', order: 1, questions: [
            { id: 'q1', prompt: "What are your top 3 business priorities for the next 12 months?", type: 'textarea', is_required: true, order: 1 },
            { id: 'q2', prompt: "Describe your ideal outcome after a successful AI implementation.", type: 'textarea', is_required: true, order: 2 },
            { id: 'q3', prompt: "What is your estimated annual revenue?", type: 'text', is_required: false, order: 3 },
        ]},
        { id: 'demo-sec-2', title: 'Data & Infrastructure', description: 'Tell us about your current data landscape and technical capabilities.', order: 2, questions: [
            { id: 'q4', prompt: "Where is your primary customer data stored? (e.g., Salesforce, HubSpot, custom database)", type: 'text', is_required: true, order: 1 },
            { id: 'q5', prompt: "On a scale of 1-5, how would you rate your team's technical expertise in data management?", type: 'text', is_required: true, order: 2 },
        ]}
    ]
};

// --- API & COMPONENT LOGIC ---
const fetchFullQuestionnaire = async (id: string): Promise<Questionnaire> => {
    const res = await fetch(`/api/questionnaires/${id}/full`);
    if (!res.ok) throw new Error("Form not found or unavailable.");
    return res.json();
};

const submitResponse = async (vars: { questionnaire_id: string; respondent_id: string; answers: Record<string, any> }) => {
    const res = await fetch('/api/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to submit your response. Please try again.");
    }
    return res.json();
};

const FormField = ({ question }: { question: QuestionType }) => {
    const { register, formState: { errors } } = useFormContext();
    const fieldError = errors[question.id];
    return (
        <>
            {question.type === 'textarea' ? <Textarea id={question.id} {...register(question.id, { required: question.is_required })} placeholder="Your detailed response..." className="min-h-[120px]" /> : <Input id={question.id} {...register(question.id, { required: question.is_required })} placeholder="Your response..." />}
            {fieldError && <p className="text-sm text-destructive mt-1">This field is required.</p>}
        </>
    );
};

const SidebarSection = ({ section, index, scrollToElement }: { section: SectionType; index: number; scrollToElement: (id: string) => void }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    return (
        <div className="space-y-1">
            <button
                type="button"
                onClick={() => {
                    setIsExpanded(!isExpanded);
                    scrollToElement(`section-${section.id}`);
                }}
                className="w-full text-left px-3 py-2.5 text-sm font-medium hover:bg-accent rounded-md transition-colors flex items-center justify-between group border border-transparent hover:border-primary/20"
            >
                <span className="flex-1 pr-2">{index + 1}. {section.title}</span>
                <svg 
                    className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {isExpanded && (
                <div className="ml-3 space-y-0.5 border-l-2 border-muted pl-3 py-1">
                    {section.questions.map((question, qIndex) => (
                        <button
                            key={question.id}
                            type="button"
                            onClick={() => scrollToElement(`question-${question.id}`)}
                            className="w-full text-left px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded transition-colors"
                        >
                            Question {qIndex + 1}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const FormSectionComponent = ({ section, sectionNumber }: { section: SectionType; sectionNumber: number }) => (
    <section id={`section-${section.id}`} className="scroll-mt-24 space-y-6">
        <div className="mb-8"><div className="flex items-center gap-3 mb-2"><Badge variant="outline" className="rounded-full">Section {sectionNumber}</Badge><h2 className="text-2xl font-semibold">{section.title}</h2></div><p className="text-muted-foreground">{section.description || 'Please answer the following questions.'}</p></div>
        {section.questions.map((question, index) => (<Card key={question.id} id={`question-${question.id}`} className="scroll-mt-24"><CardHeader><Label htmlFor={question.id} className="text-base font-medium leading-relaxed">{index + 1}. {question.prompt}{question.is_required && <span className="text-destructive ml-1">*</span>}</Label></CardHeader><CardContent><FormField question={question} /></CardContent></Card>))}
    </section>
);

// --- MAIN COMPONENT ---
const ClientForm = () => {
    const { id: questionnaireId } = useParams<{ id: string }>();
    const { toast } = useToast();
    const methods = useForm();
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [submittedData, setSubmittedData] = useState<Record<string, any> | null>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isRestored, setIsRestored] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const lastSavedDataRef = useRef<string>("");

    const isDemoMode = questionnaireId === 'demo';

    // --- Session ID Management ---
    useEffect(() => {
        if (isDemoMode) return;
        const key = `form-session-id-${questionnaireId}`;
        let sid = localStorage.getItem(key);
        if (!sid) {
            sid = crypto.randomUUID();
            localStorage.setItem(key, sid);
        }
        setSessionId(sid);
    }, [questionnaireId, isDemoMode]);

    // --- Fetch Questionnaire and Saved Progress ---
    const { data: questionnaire, isLoading, isError, error } = useQuery({
        queryKey: ['fullQuestionnaire', questionnaireId],
        queryFn: () => fetchFullQuestionnaire(questionnaireId!),
        enabled: !isDemoMode && !!questionnaireId,
    });

    useQuery({
        queryKey: ['formProgress', sessionId],
        queryFn: async () => {
            if (!sessionId) return null;
            const res = await fetch(`/api/responses?sessionId=${sessionId}&questionnaireId=${questionnaireId}`);
            if (!res.ok) return null;
            const data = await res.json();
            if (data?.answers) {
                methods.reset(data.answers);
                lastSavedDataRef.current = JSON.stringify(data.answers);
            }
            setIsRestored(true);
            return data;
        },
        enabled: !!sessionId && !!questionnaireId,
        refetchOnWindowFocus: false,
    });

    const activeQuestionnaire = isDemoMode ? mockDemoQuestionnaire : questionnaire;

    // --- Autosave Logic ---
    const formValues = methods.watch();
    const [debouncedFormValues] = useDebounce(formValues, 3000); // Increased to 3 seconds

    const saveProgressMutation = useMutation({
        mutationFn: async (answers: Record<string, any>) => {
            if (!sessionId || !questionnaireId || isDemoMode) return;
            
            const nonEmptyAnswers = Object.fromEntries(
                Object.entries(answers).filter(([_, value]) => value !== "" && value !== null && value !== undefined)
            );
            
            if (Object.keys(nonEmptyAnswers).length === 0) return;

            // Check if data has actually changed
            const currentDataString = JSON.stringify(nonEmptyAnswers);
            if (currentDataString === lastSavedDataRef.current) {
                return; // No changes, skip save
            }

            // Cancel any pending request
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            // Create new abort controller for this request
            abortControllerRef.current = new AbortController();

            const res = await fetch('/api/responses', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    questionnaire_id: questionnaireId,
                    respondent_id: sessionId,
                    answers: nonEmptyAnswers,
                }),
                signal: abortControllerRef.current.signal,
            });

            if (!res.ok) {
                throw new Error('Failed to save progress');
            }

            // Update last saved data reference
            lastSavedDataRef.current = currentDataString;

            return res.json();
        },
        onMutate: () => {
            setIsSaving(true);
            setSaveError(false);
        },
        onSuccess: () => {
            setIsSaving(false);
            setSaveError(false);
        },
        onError: (error: any) => {
            // Don't show error if request was aborted (user is still typing)
            if (error.name !== 'AbortError') {
                console.error("Failed to save progress:", error);
                setIsSaving(false);
                setSaveError(true);
            } else {
                // Request was cancelled, reset saving state
                setIsSaving(false);
            }
        }
    });

    // Simplified autosave effect without useCallback dependency issues
    useEffect(() => {
        if (!isRestored || !methods.formState.isDirty || isDemoMode) return;
        
        const nonEmptyAnswers = Object.fromEntries(
            Object.entries(debouncedFormValues).filter(([_, value]) => value !== "" && value !== null && value !== undefined)
        );
        
        if (Object.keys(nonEmptyAnswers).length > 0) {
            saveProgressMutation.mutate(nonEmptyAnswers);
        }
    }, [debouncedFormValues, isRestored, isDemoMode]);

    // Cleanup abort controller on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    // --- Final Submit Logic ---
    const finalSubmitMutation = useMutation({
        mutationFn: submitResponse,
        onSuccess: () => {
            setIsSubmitted(true);
            if (sessionId && questionnaireId) {
                localStorage.removeItem(`form-session-id-${questionnaireId}`);
            }
        },
        onError: (e: Error) => {
            toast({ title: "Submission Error", description: e.message, variant: 'destructive' });
        }
    });

    const onSubmit = async (data: Record<string, any>) => {
        // Cancel any pending autosave
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Wait for any pending autosave to complete
        if (isSaving) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        const nonEmptyAnswers = Object.fromEntries(
            Object.entries(data).filter(([_, value]) => value !== "" && value !== null && value !== undefined)
        );

        if (Object.keys(nonEmptyAnswers).length === 0) {
            toast({ 
                title: "No answers provided", 
                description: "Please answer at least one question before submitting.",
                variant: 'destructive' 
            });
            return;
        }

        setSubmittedData(nonEmptyAnswers);

        if (isDemoMode) {
            toast({ title: "Demo Submitted!", description: "This is a sample form. Your answers were not saved." });
            setIsSubmitted(true);
            return;
        }

        if (sessionId) {
            finalSubmitMutation.mutate({ 
                questionnaire_id: questionnaireId!, 
                respondent_id: sessionId, 
                answers: nonEmptyAnswers 
            });
        } else {
            toast({ title: "Error", description: "Session ID is missing. Cannot submit.", variant: 'destructive' });
        }
    };

    const handleDownloadPdf = async () => {
        if (!activeQuestionnaire || !submittedData) return;
        setIsGeneratingPdf(true);
        let logoUrl: string | null = null;

        try {
            const doc = new jsPDF();
            const pageHeight = doc.internal.pageSize.height;
            const pageWidth = doc.internal.pageSize.width;
            const margin = 20;
            const contentWidth = pageWidth - (margin * 2);
            let yPos = 20;
            
            const logoResponse = await fetch(logo);
            const logoBlob = await logoResponse.blob();
            logoUrl = URL.createObjectURL(logoBlob);
            
            const logoWidth = 30;
            const logoHeight = 10;
            doc.addImage(logoUrl, 'PNG', margin, yPos, logoWidth, logoHeight);

            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text(activeQuestionnaire.title, pageWidth - margin, yPos, { align: 'right' });
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(activeQuestionnaire.organization, pageWidth - margin, yPos + 6, { align: 'right' });
            
            yPos += Math.max(logoHeight, 12) + 10;
            doc.setLineWidth(0.5);
            doc.line(margin, yPos, pageWidth - margin, yPos);
            yPos += 15;
            
            activeQuestionnaire.sections?.forEach((section) => {
                if (yPos > pageHeight - 30) { doc.addPage(); yPos = margin; }
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(80);
                doc.text(section.title, margin, yPos);
                yPos += 8;
    
                section.questions.forEach((question) => {
                    if (submittedData[question.id]) {
                        if (yPos > pageHeight - 20) { doc.addPage(); yPos = margin; }
                        doc.setFontSize(11);
                        doc.setFont('helvetica', 'bold');
                        const qText = doc.splitTextToSize(`Q: ${question.prompt}`, contentWidth);
                        doc.text(qText, margin, yPos);
                        yPos += (qText.length * 5) + 2;
    
                        if (yPos > pageHeight - 20) { doc.addPage(); yPos = margin; }
                        doc.setFontSize(11);
                        doc.setFont('helvetica', 'normal');
                        doc.setTextColor(0);
                        const aText = doc.splitTextToSize(`A: ${submittedData[question.id]}`, contentWidth - 5);
                        doc.text(aText, margin + 5, yPos);
                        yPos += (aText.length * 5) + 10;
                    }
                });
            });

            doc.save(`${activeQuestionnaire.organization}-answers.pdf`);
        } catch (err: any) {
            console.error(err);
            toast({ 
                title: "Failed to generate PDF", 
                description: err.message || "An unknown error occurred.", 
                variant: "destructive" 
            });
        } finally {
            // Clean up the blob URL to prevent memory leak
            if (logoUrl) {
                URL.revokeObjectURL(logoUrl);
            }
            setIsGeneratingPdf(false);
        }
    };

    const scrollToElement = (elementId: string) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    if (isLoading && !isDemoMode) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /> <span className="ml-2">Loading Form...</span></div>;
    if (isError && !isDemoMode) return <div className="flex h-screen items-center justify-center text-destructive">Error: {error.message}</div>;
    if (!activeQuestionnaire) return <div className="flex h-screen items-center justify-center">Form not found.</div>;

    if (isSubmitted) {
        return (
            <div className="flex flex-col h-screen items-center justify-center text-center p-4 bg-background">
                <PartyPopper className="h-16 w-16 text-primary mb-4" />
                <h1 className="text-3xl font-bold">Thank You!</h1>
                <p className="text-muted-foreground mt-2 max-w-md">Your response has been successfully submitted.</p>
                <div className="flex gap-4 mt-8">
                    <Button onClick={handleDownloadPdf} disabled={!submittedData || isGeneratingPdf} className="gap-2">
                        {isGeneratingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        {isGeneratingPdf ? 'Generating...' : 'Download Your Answers'}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(onSubmit)} className="min-h-screen bg-surface">
                <header className="border-b bg-background sticky top-0 z-10 px-6 py-4">
                    <div className="mx-auto flex max-w-7xl items-center justify-between">
                        <img src={logo} alt="Intersect Discovery Logo" className="h-8 w-auto" />
                        <div className="text-right">
                            <h1 className="text-xl font-semibold">{activeQuestionnaire.title}</h1>
                            <p className="text-sm text-muted-foreground mt-1">{activeQuestionnaire.organization}</p>
                        </div>
                    </div>
                </header>
                
                <div className="mx-auto max-w-7xl px-6 py-8 flex gap-8">
                    <aside className="hidden lg:block w-64 shrink-0 sticky top-24 self-start">
                        <div className="border rounded-lg bg-background overflow-hidden" style={{ maxHeight: 'calc(100vh - 120px)' }}>
                            <div className="p-4 border-b bg-muted/30">
                                <h3 className="font-semibold text-sm">Form Navigation</h3>
                            </div>
                            <nav className="overflow-y-auto p-3 space-y-1" style={{ maxHeight: 'calc(100vh - 180px)' }}>
                                {activeQuestionnaire.sections?.map((section, index) => (
                                    <SidebarSection 
                                        key={section.id} 
                                        section={section} 
                                        index={index}
                                        scrollToElement={scrollToElement}
                                    />
                                ))}
                            </nav>
                        </div>
                    </aside>

                    <main className="flex-1 max-w-4xl">
                        <div className="space-y-16">
                            {activeQuestionnaire.sections?.map((section, index) => (
                               <FormSectionComponent key={section.id} section={section} sectionNumber={index + 1} />
                            ))}
                            {(!activeQuestionnaire.sections || activeQuestionnaire.sections.length === 0) && (
                                <div className="text-center p-8 border rounded-lg">
                                    <p className="text-muted-foreground">This form has no questions yet.</p>
                                </div>
                            )}
                        </div>
                    </main>
                </div>

                <footer className="sticky bottom-0 border-t bg-background/80 backdrop-blur-sm p-4">
                    <div className="mx-auto max-w-7xl flex justify-between items-center">
                        <span className="text-sm text-muted-foreground transition-opacity duration-300">
                            {!isDemoMode && isRestored && (
                                isSaving ? 'Saving...' : saveError ? 'Failed to save changes' : 'All changes saved'
                            )}
                        </span>
                        <Button 
                            type="submit" 
                            size="lg" 
                            disabled={finalSubmitMutation.isPending || isSaving}
                        >
                            {finalSubmitMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit Response
                        </Button>
                    </div>
                </footer>
            </form>
        </FormProvider>
    );
};

export default ClientForm;