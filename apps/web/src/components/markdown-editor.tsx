import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Textarea } from '~/components/ui/textarea';
import { Markdown } from './markdown';

/** A textarea with a Write/Preview switch. Takes the textarea's props (RHF `field` included). */
export function MarkdownEditor({
  value,
  ...props
}: ComponentProps<typeof Textarea> & { value: string }) {
  const { t } = useTranslation();
  return (
    <Tabs defaultValue="write">
      <TabsList>
        <TabsTrigger value="write">{t('markdown.write')}</TabsTrigger>
        <TabsTrigger value="preview">{t('markdown.preview')}</TabsTrigger>
      </TabsList>
      {/* Always mounted: the label's htmlFor, RHF's ref and focus-on-error keep working. */}
      <TabsContent
        value="write"
        forceMount
        className="data-[state=inactive]:hidden"
      >
        <Textarea {...props} value={value} rows={6} />
      </TabsContent>
      <TabsContent value="preview" className="min-h-16">
        {value.trim() ? (
          <Markdown>{value}</Markdown>
        ) : (
          <p className="text-muted-foreground">{t('markdown.emptyPreview')}</p>
        )}
      </TabsContent>
    </Tabs>
  );
}
