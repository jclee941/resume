-- Pandoc Lua filter: strip emoji codepoints not covered by NanumGothic
-- Prevents "Missing character" warnings and blank glyphs in xelatex output.
-- Strips Unicode ranges: Emoji / Misc Symbols / Dingbats / Supplemental Symbols
function Str(el)
  local cleaned = el.text:gsub('[\240\159][\128-\191][\128-\191][\128-\191]', '')
  cleaned = cleaned:gsub('[\226][\152-\158][\128-\191]', '')
  -- Trim leftover whitespace if emoji was the only content
  cleaned = cleaned:gsub('^%s+', ''):gsub('%s+$', '')
  if cleaned == '' then
    return {}
  end
  el.text = cleaned
  return el
end
