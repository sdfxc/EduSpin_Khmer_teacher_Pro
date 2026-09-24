import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  BorderStyle,
  WidthType,
  VerticalAlign,
  HeadingLevel
} from 'docx';
import { LessonPlanItem, WordDocItem } from '../types/lessonMaterials';

export async function exportLessonPlanToDocx(plan: LessonPlanItem) {
  const fontBody = 'Khmer OS Content';
  const fontTitle = 'Khmer OS Muol Light';

  const cellBorder = {
    top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
    left: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
    right: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' }
  };

  const headerCell = (text: string, widthPercent: number) => new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    borders: cellBorder,
    shading: { fill: 'EEF2F6' },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 120 },
        children: [
          new TextRun({
            text,
            font: fontTitle,
            size: 20, // 10pt
            bold: true,
            color: '1E293B'
          })
        ]
      })
    ]
  });

  const contentCell = (text: string, widthPercent: number, align: any = AlignmentType.LEFT) => new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    borders: cellBorder,
    verticalAlign: VerticalAlign.TOP,
    children: text.split('\n').map(line => new Paragraph({
      alignment: align,
      spacing: { before: 80, after: 80, line: 320 },
      children: [
        new TextRun({
          text: line,
          font: fontBody,
          size: 22, // 11pt
          color: '334155'
        })
      ]
    }))
  });

  const stepsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          headerCell('ជំហានបង្រៀន / រយៈពេល', 20),
          headerCell('សកម្មភាពគ្រូ', 26),
          headerCell('ខ្លឹមសារមេរៀន', 28),
          headerCell('សកម្មភាពសិស្ស', 26)
        ]
      }),
      // Step 1: Admin
      new TableRow({
        children: [
          contentCell(`ជំហានទី១៖ រដ្ឋបាលថ្នាក់\n(${plan.steps.step1Admin.duration || '៥ នាទី'})`, 20, AlignmentType.CENTER),
          contentCell(plan.steps.step1Admin.teacherActivity || 'ពិនិត្យអនាម័យ សណ្តាប់ធ្នាប់ និងវត្តមានសិស្ស', 26),
          contentCell('រដ្ឋបាលថ្នាក់រៀន', 28),
          contentCell(plan.steps.step1Admin.studentActivity || 'ប្រធានថ្នាក់រាយការណ៍វត្តមាន និងសិស្សអង្គុយប្រកបដោយរបៀបរៀបរយ', 26)
        ]
      }),
      // Step 2: Review
      new TableRow({
        children: [
          contentCell(`ជំហានទី២៖ រំលឹកមេរៀនចាស់\n(${plan.steps.step2Review.duration || '៥ នាទី'})`, 20, AlignmentType.CENTER),
          contentCell(plan.steps.step2Review.teacherActivity, 26),
          contentCell(plan.steps.step2Review.content, 28),
          contentCell(plan.steps.step2Review.studentActivity, 26)
        ]
      }),
      // Step 3: New Lesson
      new TableRow({
        children: [
          contentCell(`ជំហានទី៣៖ មេរៀនថ្មី\n(${plan.steps.step3NewLesson.duration || '២៥ នាទី'})`, 20, AlignmentType.CENTER),
          contentCell(plan.steps.step3NewLesson.teacherActivity, 26),
          contentCell(plan.steps.step3NewLesson.content, 28),
          contentCell(plan.steps.step3NewLesson.studentActivity, 26)
        ]
      }),
      // Step 4: Strengthen
      new TableRow({
        children: [
          contentCell(`ជំហានទី៤៖ ពង្រឹងចំណេះដឹង\n(${plan.steps.step4Strengthen.duration || '១០ នាទី'})`, 20, AlignmentType.CENTER),
          contentCell(plan.steps.step4Strengthen.teacherActivity, 26),
          contentCell(plan.steps.step4Strengthen.content, 28),
          contentCell(plan.steps.step4Strengthen.studentActivity, 26)
        ]
      }),
      // Step 5: Homework
      new TableRow({
        children: [
          contentCell(`ជំហានទី៥៖ កិច្ចការផ្ទះ\n(${plan.steps.step5Homework.duration || '៥ នាទី'})`, 20, AlignmentType.CENTER),
          contentCell(plan.steps.step5Homework.teacherActivity, 26),
          contentCell(plan.steps.step5Homework.content, 28),
          contentCell(plan.steps.step5Homework.studentActivity, 26)
        ]
      })
    ]
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1000, bottom: 1000, left: 1200, right: 1200 }
          }
        },
        children: [
          // Header Kingdom of Cambodia
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [
              new TextRun({ text: 'ព្រះរាជាណាចក្រកម្ពុជា', font: fontTitle, size: 26, bold: true, color: '1E3A8A' })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({ text: 'ជាតិ សាសនា ព្រះមហាក្សត្រ', font: fontTitle, size: 22, color: '1E3A8A' })
            ]
          }),

          // School & Teacher line
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({ text: `${plan.schoolName || 'សាលារៀនសុវណ្ណភូមិ'}`, font: fontTitle, size: 22, bold: true, color: '0F172A' })
            ]
          }),

          // Main Lesson Plan Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 160 },
            children: [
              new TextRun({ text: 'កិច្ចតែងការបង្រៀន', font: fontTitle, size: 30, bold: true, color: '1E293B' })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [
              new TextRun({ text: plan.title, font: fontTitle, size: 24, bold: true, color: '2563EB' })
            ]
          }),

          // Metadata Info
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({ text: '• មុខវិជ្ជា៖ ', font: fontBody, bold: true, size: 22 }),
              new TextRun({ text: plan.subject, font: fontBody, size: 22 }),
              new TextRun({ text: '   |   ថ្នាក់ទី៖ ', font: fontBody, bold: true, size: 22 }),
              new TextRun({ text: plan.grade, font: fontBody, size: 22 }),
              new TextRun({ text: '   |   រយៈពេល៖ ', font: fontBody, bold: true, size: 22 }),
              new TextRun({ text: plan.duration, font: fontBody, size: 22 })
            ]
          }),
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({ text: '• ជំពូក/មេរៀន៖ ', font: fontBody, bold: true, size: 22 }),
              new TextRun({ text: plan.chapter, font: fontBody, size: 22 }),
              new TextRun({ text: '   |   កាលបរិច្ឆេទ៖ ', font: fontBody, bold: true, size: 22 }),
              new TextRun({ text: plan.date, font: fontBody, size: 22 }),
              new TextRun({ text: '   |   គ្រូបង្រៀន៖ ', font: fontBody, bold: true, size: 22 }),
              new TextRun({ text: plan.teacherName, font: fontBody, size: 22 })
            ]
          }),

          // Section I: Objectives
          new Paragraph({
            spacing: { before: 240, after: 120 },
            children: [
              new TextRun({ text: 'I. វត្ថុបំណងនៃការបង្រៀន (Objectives)', font: fontTitle, size: 24, bold: true, color: '1E40AF' })
            ]
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: '១. ផ្នែកចំណេះដឹង៖', font: fontBody, bold: true, size: 22 })
            ]
          }),
          ...(plan.objectives.knowledge || []).map(k => new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 40 },
            children: [new TextRun({ text: k, font: fontBody, size: 22 })]
          })),
          new Paragraph({
            spacing: { before: 100, after: 60 },
            children: [
              new TextRun({ text: '២. ផ្នែកបំណិន៖', font: fontBody, bold: true, size: 22 })
            ]
          }),
          ...(plan.objectives.skills || []).map(s => new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 40 },
            children: [new TextRun({ text: s, font: fontBody, size: 22 })]
          })),
          new Paragraph({
            spacing: { before: 100, after: 60 },
            children: [
              new TextRun({ text: '៣. ផ្នែកឥរិយាបថ៖', font: fontBody, bold: true, size: 22 })
            ]
          }),
          ...(plan.objectives.attitude || []).map(a => new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 40 },
            children: [new TextRun({ text: a, font: fontBody, size: 22 })]
          })),

          // Section II: Teaching Aids
          new Paragraph({
            spacing: { before: 240, after: 120 },
            children: [
              new TextRun({ text: 'II. សម្ភារឧបទេស (Teaching Aids)', font: fontTitle, size: 24, bold: true, color: '1E40AF' })
            ]
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: '• សម្ភារគ្រូ៖ ', font: fontBody, bold: true, size: 22 }),
              new TextRun({ text: plan.teachingAids.teacher, font: fontBody, size: 22 })
            ]
          }),
          new Paragraph({
            spacing: { after: 160 },
            children: [
              new TextRun({ text: '• សម្ភារសិស្ស៖ ', font: fontBody, bold: true, size: 22 }),
              new TextRun({ text: plan.teachingAids.student, font: fontBody, size: 22 })
            ]
          }),

          // Section III: Teaching Steps Table
          new Paragraph({
            spacing: { before: 200, after: 160 },
            children: [
              new TextRun({ text: 'III. ដំណើរការបង្រៀន (Teaching Process - 5 Steps)', font: fontTitle, size: 24, bold: true, color: '1E40AF' })
            ]
          }),
          stepsTable,

          // Section IV: Evaluation & Reflection
          ...(plan.evaluation ? [
            new Paragraph({
              spacing: { before: 240, after: 80 },
              children: [
                new TextRun({ text: 'IV. ការវាយតម្លៃការបង្រៀន (Evaluation)', font: fontTitle, size: 24, bold: true, color: '1E40AF' })
              ]
            }),
            new Paragraph({
              spacing: { after: 120 },
              children: [new TextRun({ text: plan.evaluation, font: fontBody, size: 22 })]
            })
          ] : []),

          // Signatures Section
          new Paragraph({
            spacing: { before: 400, after: 100 },
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: `ធ្វើនៅ ${plan.schoolName || 'រាជធានីភ្នំពេញ'}, ថ្ងៃទី....... ខែ....... ឆ្នាំ២០២៦`, font: fontBody, size: 20, italics: true })
            ]
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE },
                      bottom: { style: BorderStyle.NONE },
                      left: { style: BorderStyle.NONE },
                      right: { style: BorderStyle.NONE }
                    },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: 'បានឃើញ និងឯកភាព\nនាយកសាលា', font: fontTitle, size: 22, bold: true })]
                      })
                    ]
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE },
                      bottom: { style: BorderStyle.NONE },
                      left: { style: BorderStyle.NONE },
                      right: { style: BorderStyle.NONE }
                    },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: 'ហត្ថលេខាគ្រូបង្រៀន\n\n\n\n\n', font: fontTitle, size: 22, bold: true }),
                          new TextRun({ text: plan.teacherName, font: fontTitle, size: 22, bold: true })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `កិច្ចតែងការ_${plan.title.replace(/\s+/g, '_')}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

export async function exportWordDocContentToDocx(docItem: WordDocItem, schoolName?: string, teacherName?: string) {
  const fontBody = 'Khmer OS Content';
  const fontTitle = 'Khmer OS Muol Light';

  const paragraphs: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({ text: schoolName || 'សាលារៀនសុវណ្ណភូមិ', font: fontTitle, size: 26, bold: true, color: '1E3A8A' })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({ text: docItem.title, font: fontTitle, size: 28, bold: true, color: '2563EB' })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({ text: `មុខវិជ្ជា៖ ${docItem.subject || 'ទូទៅ'}  |  ${docItem.grade || ''}  |  កាលបរិច្ឆេទ៖ ${new Date(docItem.createdAt).toLocaleDateString('km-KH')}`, font: fontBody, size: 20, color: '64748B' })
      ]
    })
  ];

  if (docItem.description) {
    paragraphs.push(new Paragraph({
      spacing: { after: 160 },
      children: [
        new TextRun({ text: `សេចក្តីពិពណ៌នា៖ ${docItem.description}`, font: fontBody, size: 22, italics: true, color: '475569' })
      ]
    }));
  }

  // Parse lines of content
  const lines = (docItem.content || '').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      paragraphs.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
      continue;
    }

    if (trimmed.startsWith('# ')) {
      paragraphs.push(new Paragraph({
        spacing: { before: 200, after: 120 },
        children: [new TextRun({ text: trimmed.replace('# ', ''), font: fontTitle, size: 26, bold: true, color: '1E3A8A' })]
      }));
    } else if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
      paragraphs.push(new Paragraph({
        spacing: { before: 160, after: 80 },
        children: [new TextRun({ text: trimmed.replace(/^###?\s*/, ''), font: fontTitle, size: 22, bold: true, color: '2563EB' })]
      }));
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      paragraphs.push(new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 60 },
        children: [new TextRun({ text: trimmed.replace(/^[-*]\s*/, ''), font: fontBody, size: 22 })]
      }));
    } else {
      paragraphs.push(new Paragraph({
        spacing: { after: 80, line: 320 },
        children: [new TextRun({ text: trimmed, font: fontBody, size: 22, color: '1E293B' })]
      }));
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: { margin: { top: 1200, bottom: 1200, left: 1200, right: 1200 } }
        },
        children: paragraphs
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${docItem.title.replace(/\s+/g, '_')}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
