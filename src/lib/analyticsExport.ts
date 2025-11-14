import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ZoneAnalytics {
  overall: {
    green: number;
    grey: number;
    red: number;
  };
  bySubject: Record<string, { green: number; grey: number; red: number }>;
  byBatch: Record<string, { green: number; grey: number; red: number }>;
  problemTopics: Array<{
    topic_name: string;
    subject: string;
    chapter: string;
    avg_completion: number;
    struggling_count: number;
  }>;
}

export const exportAnalyticsToCSV = (analytics: ZoneAnalytics) => {
  const timestamp = new Date().toLocaleString();
  const totalTopics = analytics.overall.green + analytics.overall.grey + analytics.overall.red;
  
  let csv = `Topic Zone Analytics Report\n`;
  csv += `Generated: ${timestamp}\n\n`;
  
  // Overall Distribution
  csv += `OVERALL DISTRIBUTION\n`;
  csv += `Zone,Count,Percentage\n`;
  csv += `Green (>70%),${analytics.overall.green},${((analytics.overall.green / totalTopics) * 100).toFixed(1)}%\n`;
  csv += `Grey (50-70%),${analytics.overall.grey},${((analytics.overall.grey / totalTopics) * 100).toFixed(1)}%\n`;
  csv += `Red (<50%),${analytics.overall.red},${((analytics.overall.red / totalTopics) * 100).toFixed(1)}%\n\n`;
  
  // Subject-wise Distribution
  csv += `SUBJECT-WISE DISTRIBUTION\n`;
  csv += `Subject,Green,Grey,Red,Total\n`;
  Object.entries(analytics.bySubject).forEach(([subject, zones]) => {
    const total = zones.green + zones.grey + zones.red;
    csv += `${subject},${zones.green},${zones.grey},${zones.red},${total}\n`;
  });
  csv += `\n`;
  
  // Batch-wise Distribution
  csv += `BATCH-WISE DISTRIBUTION\n`;
  csv += `Batch,Green,Grey,Red,Total\n`;
  Object.entries(analytics.byBatch).forEach(([batch, zones]) => {
    const total = zones.green + zones.grey + zones.red;
    csv += `${batch},${zones.green},${zones.grey},${zones.red},${total}\n`;
  });
  csv += `\n`;
  
  // Problem Topics
  csv += `PROBLEM TOPICS (Red Zone)\n`;
  csv += `Topic,Subject,Chapter,Avg Completion %,Struggling Students\n`;
  analytics.problemTopics.forEach(topic => {
    csv += `"${topic.topic_name}","${topic.subject}","${topic.chapter}",${topic.avg_completion.toFixed(1)}%,${topic.struggling_count}\n`;
  });
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const filename = `topic-zone-analytics-${new Date().toISOString().split('T')[0]}.csv`;
  saveAs(blob, filename);
};

export const exportAnalyticsToPDF = (analytics: ZoneAnalytics) => {
  const doc = new jsPDF();
  const timestamp = new Date().toLocaleString();
  const totalTopics = analytics.overall.green + analytics.overall.grey + analytics.overall.red;
  
  // Header
  doc.setFontSize(18);
  doc.text('Topic Zone Analytics Report', 14, 20);
  doc.setFontSize(10);
  doc.text(`Generated: ${timestamp}`, 14, 28);
  
  // Overall Distribution
  doc.setFontSize(14);
  doc.text('Overall Distribution', 14, 40);
  
  autoTable(doc, {
    startY: 45,
    head: [['Zone', 'Count', 'Percentage']],
    body: [
      ['Green (>70%)', analytics.overall.green.toString(), `${((analytics.overall.green / totalTopics) * 100).toFixed(1)}%`],
      ['Grey (50-70%)', analytics.overall.grey.toString(), `${((analytics.overall.grey / totalTopics) * 100).toFixed(1)}%`],
      ['Red (<50%)', analytics.overall.red.toString(), `${((analytics.overall.red / totalTopics) * 100).toFixed(1)}%`],
      ['Total', totalTopics.toString(), '100%']
    ],
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] }
  });
  
  // Subject-wise Distribution
  const subjectTableY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(14);
  doc.text('Subject-wise Distribution', 14, subjectTableY);
  
  const subjectData = Object.entries(analytics.bySubject).map(([subject, zones]) => {
    const total = zones.green + zones.grey + zones.red;
    return [subject, zones.green.toString(), zones.grey.toString(), zones.red.toString(), total.toString()];
  });
  
  autoTable(doc, {
    startY: subjectTableY + 5,
    head: [['Subject', 'Green', 'Grey', 'Red', 'Total']],
    body: subjectData,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] }
  });
  
  // Add new page for problem topics if needed
  if (analytics.problemTopics.length > 0) {
    doc.addPage();
    
    doc.setFontSize(14);
    doc.text('Problem Topics (Red Zone)', 14, 20);
    
    const problemData = analytics.problemTopics.slice(0, 20).map(topic => [
      topic.topic_name,
      topic.subject,
      topic.chapter,
      `${topic.avg_completion.toFixed(1)}%`,
      topic.struggling_count.toString()
    ]);
    
    autoTable(doc, {
      startY: 25,
      head: [['Topic', 'Subject', 'Chapter', 'Avg Completion', 'Struggling']],
      body: problemData,
      theme: 'grid',
      headStyles: { fillColor: [239, 68, 68] },
      styles: { fontSize: 8 }
    });
  }
  
  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }
  
  const filename = `topic-zone-analytics-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};
