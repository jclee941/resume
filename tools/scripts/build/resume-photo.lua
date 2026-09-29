-- Pandoc Lua filter: put the resume photo beside the name header in LaTeX output.
-- Enabled with --metadata photo=<path>. The first level-1 heading (the name) and a
-- short paragraph right after it (the headline) go on the left, the photo on the right;
-- a document without a level-1 heading gets the photo right-aligned above its content.
local PHOTO_WIDTH = '2.3cm'
local HEADLINE_MAX_CHARS = 60

local function latex(inlines)
  return pandoc.write(pandoc.Pandoc({ pandoc.Plain(inlines) }), 'latex')
end

local function photoBox(path)
  return '\\begin{minipage}[t]{' .. PHOTO_WIDTH .. '}\\vspace{0pt}\\raggedleft'
    .. '\\includegraphics[width=' .. PHOTO_WIDTH .. ']{' .. path .. '}\\end{minipage}'
end

function Pandoc(doc)
  local photo = doc.meta.photo and pandoc.utils.stringify(doc.meta.photo) or ''
  if photo == '' or not FORMAT:match('latex') then
    return doc
  end
  local blocks = doc.blocks
  for index, block in ipairs(blocks) do
    if block.t == 'Header' and block.level == 1 then
      local left = '{\\Large\\bfseries\\color{ResumeSlate}' .. latex(block.content) .. '\\par}'
      local consumed = 1
      local headline = blocks[index + 1]
      if headline and headline.t == 'Para' then
        local text = pandoc.utils.stringify(headline)
        if (utf8.len(text) or #text) <= HEADLINE_MAX_CHARS then
          left = left .. '\\vspace{0.35em}' .. latex(headline.content)
          consumed = 2
        end
      end
      local header = '\\noindent\\begin{minipage}[t]{\\dimexpr\\textwidth-' .. PHOTO_WIDTH
        .. '-1em\\relax}\\vspace{0pt}' .. left .. '\\end{minipage}\\hfill' .. photoBox(photo)
        .. '\\par\\vspace{0.8em}'
      for _ = 1, consumed do
        table.remove(blocks, index)
      end
      table.insert(blocks, index, pandoc.RawBlock('latex', header))
      return doc
    end
  end
  table.insert(blocks, 1, pandoc.RawBlock('latex', '\\noindent\\hfill' .. photoBox(photo) .. '\\par\\vspace{0.5em}'))
  return doc
end
