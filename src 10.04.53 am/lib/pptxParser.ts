import JSZip from 'jszip';

export interface VisualSlide {
  id: string;
  slideNumber: number;
  title: string;
  subtitle?: string;
  bulletPoints: string[];
  images: string[]; // data URLs
  notes?: string;
  backgroundColor?: string;
  textColor?: string;
}

export interface ParsedPptxResult {
  title: string;
  slideCount: number;
  slides: VisualSlide[];
  rawFileName?: string;
}

// Helper to extract text from an XML string using DOMParser
function parseXml(xmlString: string): Document {
  const parser = new DOMParser();
  return parser.parseFromString(xmlString, 'application/xml');
}

export async function parsePptxFile(fileData: ArrayBuffer | Blob, fileName = 'Presentation.pptx'): Promise<ParsedPptxResult> {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(fileData);

  // 1. Find presentation.xml
  const presentationXmlFile = loadedZip.file('ppt/presentation.xml');
  const presentationRelsFile = loadedZip.file('ppt/_rels/presentation.xml.rels');

  const slideFiles: string[] = [];

  if (presentationXmlFile && presentationRelsFile) {
    try {
      const presXml = parseXml(await presentationXmlFile.async('text'));
      const relsXml = parseXml(await presentationRelsFile.async('text'));

      // Map rId to target slide filename
      const relMap: Record<string, string> = {};
      const relElements = relsXml.getElementsByTagName('Relationship');
      for (let i = 0; i < relElements.length; i++) {
        const id = relElements[i].getAttribute('Id');
        const target = relElements[i].getAttribute('Target');
        if (id && target) {
          // Normalize path: e.g. "slides/slide1.xml" -> "ppt/slides/slide1.xml"
          const fullPath = target.startsWith('ppt/') ? target : `ppt/${target.replace(/^\.\.\//, '')}`;
          relMap[id] = fullPath;
        }
      }

      // Find slide ordering from <p:sldIdLst>
      const sldIds = presXml.getElementsByTagName('p:sldId');
      for (let i = 0; i < sldIds.length; i++) {
        const rId = sldIds[i].getAttribute('r:id') || sldIds[i].getAttribute('id');
        if (rId && relMap[rId]) {
          slideFiles.push(relMap[rId]);
        }
      }
    } catch (e) {
      console.warn('Failed to parse presentation rels, falling back to scanning ppt/slides/', e);
    }
  }

  // Fallback: If rels failed or were empty, scan all ppt/slides/slide*.xml files
  if (slideFiles.length === 0) {
    const matched = Object.keys(loadedZip.files).filter(path => 
      path.startsWith('ppt/slides/slide') && path.endsWith('.xml')
    );
    // Sort naturally: slide1.xml, slide2.xml ...
    matched.sort((a, b) => {
      const numA = parseInt(a.replace(/[^0-9]/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/[^0-9]/g, ''), 10) || 0;
      return numA - numB;
    });
    slideFiles.push(...matched);
  }

  // Fallback: If still empty
  if (slideFiles.length === 0) {
    return {
      title: fileName.replace(/\.[^/.]+$/, ''),
      slideCount: 1,
      slides: [
        {
          id: 'slide-1',
          slideNumber: 1,
          title: fileName.replace(/\.[^/.]+$/, ''),
          bulletPoints: ['មិនអាចអានទម្រង់ស្លាយបានពេញលេញ។ សូមពិនិត្យមើល File PowerPoint នេះ។'],
          images: [],
        }
      ],
      rawFileName: fileName
    };
  }

  const slides: VisualSlide[] = [];
  let presentationTitle = fileName.replace(/\.[^/.]+$/, '');

  for (let index = 0; index < slideFiles.length; index++) {
    const slidePath = slideFiles[index];
    const slideFile = loadedZip.file(slidePath);
    if (!slideFile) continue;

    try {
      const slideXmlText = await slideFile.async('text');
      const slideDoc = parseXml(slideXmlText);

      // Check relationships for images
      // ppt/slides/slide1.xml -> ppt/slides/_rels/slide1.xml.rels
      const parts = slidePath.split('/');
      const slideFileName = parts.pop() || '';
      const slideRelsPath = `${parts.join('/')}/_rels/${slideFileName}.rels`;
      const slideRelsFile = loadedZip.file(slideRelsPath);

      const imageRelMap: Record<string, string> = {};
      if (slideRelsFile) {
        try {
          const relsXml = parseXml(await slideRelsFile.async('text'));
          const relationships = relsXml.getElementsByTagName('Relationship');
          for (let r = 0; r < relationships.length; r++) {
            const rel = relationships[r];
            const type = rel.getAttribute('Type') || '';
            const id = rel.getAttribute('Id') || '';
            const target = rel.getAttribute('Target') || '';
            if (type.includes('image') && id && target) {
              // Normalize image path e.g. "../media/image1.png" -> "ppt/media/image1.png"
              const imgPath = target.startsWith('ppt/') 
                ? target 
                : target.startsWith('../')
                ? `ppt/${target.replace(/^\.\.\//, '')}`
                : `ppt/slides/${target}`;
              imageRelMap[id] = imgPath;
            }
          }
        } catch (e) {
          console.warn('Error reading slide rels:', e);
        }
      }

      // Extract Images
      const slideImages: string[] = [];
      const blips = slideDoc.getElementsByTagName('a:blip');
      for (let b = 0; b < blips.length; b++) {
        const embedId = blips[b].getAttribute('r:embed');
        if (embedId && imageRelMap[embedId]) {
          const mediaPath = imageRelMap[embedId];
          const mediaFile = loadedZip.file(mediaPath);
          if (mediaFile) {
            try {
              const base64 = await mediaFile.async('base64');
              const ext = mediaPath.split('.').pop()?.toLowerCase() || 'png';
              const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'svg' ? 'image/svg+xml' : 'image/png';
              slideImages.push(`data:${mime};base64,${base64}`);
            } catch (err) {
              console.warn('Failed to load image from pptx:', mediaPath, err);
            }
          }
        }
      }

      // Extract Shapes, Grouped Shapes, Tables, Math and Text
      let slideTitle = '';
      let subtitle = '';
      const bulletPoints: string[] = [];

      // Helper to extract text from a paragraph node including text runs, fields, and math
      const extractParagraphText = (para: Element): string => {
        let text = '';
        
        // 1. Regular text runs <a:t>
        const textRuns = para.getElementsByTagName('a:t');
        for (let t = 0; t < textRuns.length; t++) {
          text += textRuns[t].textContent || '';
        }

        // 2. Field text runs <a:fld>
        const fields = para.getElementsByTagName('a:fld');
        for (let f = 0; f < fields.length; f++) {
          const fldRuns = fields[f].getElementsByTagName('a:t');
          for (let ft = 0; ft < fldRuns.length; ft++) {
            if (!text.includes(fldRuns[ft].textContent || '')) {
              text += (fldRuns[ft].textContent || '');
            }
          }
        }

        // 3. Office Math text <m:t> or <m:r>
        const mathRuns = para.getElementsByTagName('m:t');
        for (let m = 0; m < mathRuns.length; m++) {
          const mText = mathRuns[m].textContent || '';
          if (mText && !text.includes(mText)) {
            text += ` ${mText} `;
          }
        }

        return text.trim();
      };

      // 1. Find standard shapes <p:sp>
      const shapes = slideDoc.getElementsByTagName('p:sp');
      for (let s = 0; s < shapes.length; s++) {
        const sp = shapes[s];
        
        // Determine placeholder type (title, subTitle, body)
        let isTitle = false;
        let isSubTitle = false;
        const ph = sp.getElementsByTagName('p:ph')[0];
        if (ph) {
          const phType = ph.getAttribute('type');
          if (phType === 'title' || phType === 'ctrTitle') {
            isTitle = true;
          } else if (phType === 'subTitle') {
            isSubTitle = true;
          }
        }

        // Extract paragraphs
        const paragraphs = sp.getElementsByTagName('a:p');
        for (let p = 0; p < paragraphs.length; p++) {
          const para = paragraphs[p];
          const trimmed = extractParagraphText(para);
          if (!trimmed) continue;

          if (isTitle && !slideTitle) {
            slideTitle = trimmed;
          } else if (isSubTitle && !subtitle) {
            subtitle = trimmed;
          } else {
            if (!slideTitle && index === 0 && s === 0 && p === 0) {
              slideTitle = trimmed;
            } else {
              bulletPoints.push(trimmed);
            }
          }
        }
      }

      // 2. Find table cells <a:tc> and extract any text inside tables
      const tableCells = slideDoc.getElementsByTagName('a:tc');
      for (let tc = 0; tc < tableCells.length; tc++) {
        const cellParas = tableCells[tc].getElementsByTagName('a:p');
        for (let cp = 0; cp < cellParas.length; cp++) {
          const trimmed = extractParagraphText(cellParas[cp]);
          if (trimmed && !bulletPoints.includes(trimmed)) {
            bulletPoints.push(trimmed);
          }
        }
      }

      // 3. Find standalone Math blocks <m:oMath> or <m:oMathPara>
      const mathParas = slideDoc.getElementsByTagName('m:oMathPara');
      for (let mp = 0; mp < mathParas.length; mp++) {
        const mRuns = mathParas[mp].getElementsByTagName('m:t');
        let mathStr = '';
        for (let mr = 0; mr < mRuns.length; mr++) {
          mathStr += (mRuns[mr].textContent || '') + ' ';
        }
        mathStr = mathStr.trim();
        if (mathStr && !bulletPoints.includes(mathStr)) {
          bulletPoints.push(mathStr);
        }
      }

      // If no title found, fallback to first line or generic name
      if (!slideTitle) {
        if (bulletPoints.length > 0) {
          slideTitle = bulletPoints.shift() || `ស្លាយទី ${index + 1}`;
        } else {
          slideTitle = `ស្លាយទី ${index + 1}`;
        }
      }

      if (index === 0 && slideTitle && slideTitle !== `ស្លាយទី 1`) {
        presentationTitle = slideTitle;
      }

      slides.push({
        id: `slide-${index + 1}`,
        slideNumber: index + 1,
        title: slideTitle,
        subtitle: subtitle || undefined,
        bulletPoints,
        images: slideImages,
      });
    } catch (err) {
      console.warn(`Error parsing slide ${slidePath}:`, err);
      slides.push({
        id: `slide-${index + 1}`,
        slideNumber: index + 1,
        title: `ស្លាយទី ${index + 1}`,
        bulletPoints: ['មិនអាចអានខ្លឹមសារស្លាយនេះបានពេញលេញ'],
        images: [],
      });
    }
  }

  return {
    title: presentationTitle,
    slideCount: slides.length,
    slides,
    rawFileName: fileName
  };
}
