// src/pages/FormPreview.tsx
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import type { Questionnaire, Question as QuestionType, Section as SectionType } from "@/types";
// ADDED: Import for the logo
import logo from "@/assets/logo.png";

// We can reuse the same fetching logic
const fetchFullQuestionnaire = async (id: string): Promise<Questionnaire> => {
    const res = await fetch(`/api/questionnaires/${id}/full`);
    if (!res.ok) throw new Error("Preview not found or form is unavailable.");
    return res.json();
};

// Reusable component for a single form question
const FormField = ({ question }: { question: QuestionType }) => {
    const { register } = useFormContext();
    return (
        <>
            {question.type === 'textarea' ? (
                <Textarea id={question.id} {...register(question.id)} placeholder="Your detailed response..." className="min-h-[120px]" />
            ) : (
                <Input id={question.id} {...register(question.id)} placeholder="Your response..." />
            )}
        </>
    );
};

// Reusable component for a form section
const FormSectionComponent = ({ section, sectionNumber }: { section: SectionType; sectionNumber: number }) => (
    <section id={`section-${section.id}`} className="scroll-mt-24 space-y-6">
        <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
                <Badge variant="outline" className="rounded-full">Section {sectionNumber}</Badge>
                <h2 className="text-2xl font-semibold">{section.title}</h2>
            </div>
            <p className="text-muted-foreground">{section.description || 'Please answer the following questions.'}</p>
        </div>
        {section.questions.map((question, index) => (
            <Card key={question.id}>
                <CardHeader>
                    <Label htmlFor={question.id} className="text-base font-medium leading-relaxed">
                        {index + 1}. {question.prompt}
                        {question.is_required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                </CardHeader>
                <CardContent>
                    <FormField question={question} />
                </CardContent>
            </Card>
        ))}
    </section>
);

const FormPreview = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const methods = useForm();

    const { data: questionnaire, isLoading, isError, error } = useQuery({
        queryKey: ['fullQuestionnaire', id],
        queryFn: () => fetchFullQuestionnaire(id!),
        enabled: !!id,
    });

    if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /> <span className="ml-2">Loading Preview...</span></div>;
    if (isError) return <div className="flex h-screen items-center justify-center text-destructive">Error: {error.message}</div>;
    if (!questionnaire) return <div className="flex h-screen items-center justify-center">Form not found.</div>;

    // The form submission in preview mode is disabled.
    const onPreviewSubmit = () => {
        alert("This is a preview. Form submission is disabled.");
    };

    return (
        <FormProvider {...methods}>
            <div className="relative min-h-screen">
                <div className="sticky top-0 z-20 bg-primary text-primary-foreground text-center py-2 font-semibold">
                    You are in Preview Mode. Submissions are disabled.
                </div>
                <form onSubmit={onPreviewSubmit} className="bg-surface">
                    <header className="border-b bg-background sticky top-[36px] z-10 px-6 py-4">
                        <div className="flex justify-between items-center">
                            {/* 1. LOGO ON THE LEFT */}
                            <img src={logo} alt="Intersect Discovery Logo" className="h-8 w-auto" />
                            
                            {/* 2. TITLE/ORG & BUTTON ON THE RIGHT */}
                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <h1 className="text-xl font-semibold">{questionnaire.title}</h1>
                                    <p className="text-sm text-muted-foreground mt-1">{questionnaire.organization}</p>
                                </div>
                                <Button variant="outline" onClick={() => navigate(`/builder/${id}`)} className="gap-2">
                                    <ArrowLeft className="h-4 w-4" /> Back to Builder
                                </Button>
                            </div>
                        </div>
                    </header>
                    <main className="mx-auto max-w-4xl px-6 py-8">
                        <div className="space-y-16">
                            {questionnaire.sections?.map((section, index) => (
                               <FormSectionComponent key={section.id} section={section} sectionNumber={index + 1} />
                            ))}
                             {(!questionnaire.sections || questionnaire.sections.length === 0) && (
                                <div className="text-center p-8 border rounded-lg">
                                    <p className="text-muted-foreground">This form has no questions yet. Go back to the builder to add some.</p>
                                </div>
                            )}
                        </div>
                    </main>
                    <footer className="sticky bottom-0 border-t bg-background/80 backdrop-blur-sm p-4">
                        <div className="mx-auto max-w-4xl flex justify-end">
                            <Button type="button" size="lg" onClick={onPreviewSubmit} className="bg-gray-400 hover:bg-gray-400 cursor-not-allowed">
                                Submit (Disabled in Preview)
                            </Button>
                        </div>
                    </footer>
                </form>
            </div>
        </FormProvider>
    );
};

export default FormPreview;
