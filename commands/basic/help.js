const {
  SlashCommandBuilder,
  ContainerBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  MediaGalleryBuilder,
  MessageFlags
} = require('discord.js');
const config = require('../../config.js');
const fs = require('fs');
const path = require('path');
const { getLang } = require('../../utils/languageLoader');
const { getEmoji, getButtonEmoji } = require('../../UI/emojis/emoji');
const { safeDeferReply, stripLeadingIcons, handleCommandError } = require('../../utils/responseHandler');

// 1. OBTENER CATEGORÍAS DINÁMICAMENTE DESDE LAS CARPETAS
const commandsDir = path.resolve(__dirname, '../../commands');
let dynamicChoices = [{ name: "🏠 Main Menu", value: "main" }];

function getAvailableCategories() {
  if (!fs.existsSync(commandsDir)) return ['basic'];
  return fs.readdirSync(commandsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
}

const availableFolders = getAvailableCategories();
availableFolders.forEach(folder => {
  const title = folder.charAt(0).toUpperCase() + folder.slice(1);
  // Añadimos las opciones dinámicas, limitadas a un total de 25 por los límites de Discord
  if (dynamicChoices.length < 25) {
    dynamicChoices.push({ name: `📁 ${title} Commands`, value: folder });
  }
});

const data = new SlashCommandBuilder()
  .setName("help")
  .setDescription("Get information about the bot and its commands")
  .addStringOption(option =>
    option.setName("category")
      .setDescription("Select a category to view")
      .setRequired(false)
      .addChoices(...dynamicChoices)
  );

const COMMAND_MENTION_CACHE_TTL_MS = 5 * 60 * 1000;
const commandMentionCache = new Map();

// Función adaptada para leer dinámicamente
function getCommandCategory(commandName) {
  for (const folder of availableFolders) {
    const folderPath = path.join(commandsDir, folder);
    if (fs.existsSync(folderPath)) {
      const files = fs.readdirSync(folderPath);
      if (files.some(file => file.replace('.js', '') === commandName)) {
        return folder;
      }
    }
  }
  return 'basic';
}

function groupCommandsByCategory(client) {
  const grouped = {};
  availableFolders.forEach(cat => grouped[cat] = []);
  
  client.commands.forEach((cmd, name) => {
    const category = getCommandCategory(name);
    if (grouped[category]) {
      grouped[category].push(cmd);
    } else {
      if (!grouped.basic) grouped.basic = [];
      grouped.basic.push(cmd);
    }
  });
  
  return grouped;
}

function formatUptime(secondsTotal) {
  const days = Math.floor(secondsTotal / (3600 * 24));
  const hours = Math.floor((secondsTotal % (3600 * 24)) / 3600);
  const minutes = Math.floor((secondsTotal % 3600) / 60);
  const seconds = Math.floor(secondsTotal % 60);
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

function getPingStatus(ping) {
  if (ping <= 90) return `${getEmoji('success')} Excellent`;
  if (ping <= 180) return `${getEmoji('success')} Good`;
  if (ping <= 280) return `${getEmoji('warning')} Stable`;
  return `${getEmoji('error')} High`;
}

function getCommandRef(commandName, mentionMap) {
  if (!mentionMap) return `/${commandName}`;
  return mentionMap.get(commandName) || `/${commandName}`;
}

function formatCommandMention(command) {
  if (!command?.name || !command?.id) return null;

  const options = Array.isArray(command.options) ? command.options : [];
  const firstSubcommand = options.find((option) => option?.type === 1);

  if (firstSubcommand?.name) {
    return `</${command.name} ${firstSubcommand.name}:${command.id}>`;
  }

  return `</${command.name}:${command.id}>`;
}

async function getCommandMentionMap(client, interaction) {
  const guildId = interaction.guildId || 'global';
  const cache = commandMentionCache.get(guildId);
  const now = Date.now();

  if (cache && (now - cache.fetchedAt) < COMMAND_MENTION_CACHE_TTL_MS) {
    return cache.map;
  }

  const mentionMap = new Map();

  try {
    if (client.application?.commands) {
      const globalCommands = await client.application.commands.fetch();
      globalCommands.forEach((command) => {
        if (command.type === 1) {
          mentionMap.set(command.name, formatCommandMention(command) || `/${command.name}`);
        }
      });
    }
  } catch (_) {}

  try {
    if (interaction.guild?.commands) {
      const guildCommands = await interaction.guild.commands.fetch();
      guildCommands.forEach((command) => {
        if (command.type === 1) {
          mentionMap.set(command.name, formatCommandMention(command) || `/${command.name}`);
        }
      });
    }
  } catch (_) {}

  commandMentionCache.set(guildId, {
    fetchedAt: now,
    map: mentionMap
  });

  return mentionMap;
}

function getCategoryMeta(lang, categoryKey) {
  const fallback = {
    music: { name: 'Music Commands', description: 'Control music playback and settings', emoji: '🎵' },
    playlist: { name: 'Playlist Commands', description: 'Manage your playlists', emoji: '📋' },
    basic: { name: 'Basic Commands', description: 'General bot information and utilities', emoji: '💜' },
    utility: { name: 'Utility Commands', description: 'Additional utility features', emoji: '🔧' }
  };

  const langCategory = lang?.help?.categories?.[categoryKey] || {};
  const fallbackCategory = fallback[categoryKey] || {
    name: categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1) + ' Commands',
    description: `Commands for ${categoryKey}`,
    emoji: '📁'
  };

  return {
    name: langCategory.name || fallbackCategory.name,
    description: langCategory.description || fallbackCategory.description,
    emoji: langCategory.emoji || fallbackCategory.emoji
  };
}

function createNavigationButton(label, customId, emojiKey, style, disabled = false) {
  const button = new ButtonBuilder()
    .setCustomId(customId)
    .setLabel(stripLeadingIcons(label))
    .setStyle(style)
    .setDisabled(disabled);

  const emoji = getButtonEmoji(emojiKey);
  if (emoji) button.setEmoji(emoji);

  return button;
}

// 2. NUEVO SELECT MENU DE CATEGORÍAS (Reemplaza los botones de Tabs)
function buildCategorySelect(activeKey) {
  const options = [
    {
      label: '🏠 Main Menu',
      description: 'Return to the overview',
      value: 'main',
      default: activeKey === 'main' || activeKey === 'overview'
    }
  ];

  availableFolders.forEach(cat => {
    const meta = getCategoryMeta({}, cat);
    options.push({
      label: `${meta.emoji || '📁'} ${meta.name}`,
      description: `View ${meta.name} commands`,
      value: cat,
      default: activeKey === cat
    });
  });

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('help_category_select')
      .setPlaceholder('Select a category to explore...')
      .addOptions(options.slice(0, 25))
  );
}

function buildControlsRow(backCustomId) {
  return new ActionRowBuilder().addComponents(
    createNavigationButton('Back', backCustomId, 'home', ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('help_close')
      .setLabel('Close')
      .setStyle(ButtonStyle.Danger)
  );
}

function buildCommandSelect(categoryKey, commands) {
  const options = commands
    .slice(0, 25)
    .map((cmd) => ({
      label: `/${cmd.data.name}`,
      description: (cmd.data.description || 'No description').slice(0, 100),
      value: cmd.data.name
    }));

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`help_select_${categoryKey}`)
      .setPlaceholder('Select a command for detailed info')
      .addOptions(options)
  );
}

function buildCard(title, sections, actionRows = [], banner = null) {
  const container = new ContainerBuilder()
    .addTextDisplayComponents((textDisplay) => textDisplay.setContent(`## ${title}`));

  if (banner) {
    container
      .addSeparatorComponents((separator) => separator)
      .addMediaGalleryComponents(banner);
  }

  for (const section of sections) {
    container
      .addSeparatorComponents((separator) => separator)
      .addTextDisplayComponents((textDisplay) => textDisplay.setContent(section));
  }

  if (actionRows.length) {
    container
      .addSeparatorComponents((separator) => separator)
      .addActionRowComponents(actionRows);
  }

  return container;
}

function buildHelpBanner() {
  const bannerUrl = String(config.helpBannerUrl || '').trim();
  if (!bannerUrl) return null;

  try {
    new URL(bannerUrl);
  } catch (_) {
    return null;
  }

  return new MediaGalleryBuilder().addItems(
    (mediaItem) => mediaItem
      .setURL(bannerUrl)
      .setDescription('Help Banner')
  );
}

function buildRotatingCommandHint(commandMentionMap) {
  const rotating = ['play', 'queue', 'search', 'history', 'filters', 'trackinfo', 'stats', 'support'];
  const start = Math.floor(Date.now() / 30000) % rotating.length;
  const picks = [
    rotating[start],
    rotating[(start + 1) % rotating.length],
    rotating[(start + 2) % rotating.length],
    rotating[(start + 3) % rotating.length],
    rotating[(start + 4) % rotating.length]
  ];

  const refs = picks.map((name) => getCommandRef(name, commandMentionMap));
  return `${getEmoji('search')} Try: ${refs.join(' • ')}`;
}

function buildMainBody(client, lang, groupedCommands, commandMentionMap) {
  const totalCommands = client.commands.size;
  const totalServers = client.guilds.cache.size;
  const totalUsers = client.guilds.cache.reduce((acc, guild) => acc + (guild.memberCount || 0), 0);
  const uptime = formatUptime(process.uptime());
  const ping = client.ws.ping;
  const pingStatus = getPingStatus(ping);

  // Construcción dinámica de la vista de categorías
  const categoriesList = availableFolders.map(cat => {
    const meta = getCategoryMeta(lang, cat);
    const count = groupedCommands[cat] ? groupedCommands[cat].length : 0;
    return `• ${meta.emoji || '📁'} ${meta.name}: **${count}**`;
  }).join('\n');

  return [
    [
      `### ${getEmoji('commands')} Overview`,
      `• Commands: **${totalCommands}**`,
      `• Servers: **${totalServers}**`,
      `• Users: **${totalUsers.toLocaleString()}**`,
      `• Uptime: **${uptime}**`,
      `• Ping: **${ping}ms** (${pingStatus})`
    ].join('\n'),
    [
      `### 🎵 Créditos`,
      `• Creador de la Música: **GlaceYT**`
    ].join('\n'), // 3. AÑADIDO: Créditos a GlaceYT
    [
      `### ${getEmoji('folder')} Categories`,
      categoriesList
    ].join('\n'),
    `${getEmoji('home')} Select a category below to view commands.`,
    buildRotatingCommandHint(commandMentionMap)
  ];
}

// 4. PREPARADO PARA CATEGORÍAS DESCONOCIDAS
function getCategorySections(categoryKey, commands = []) {
  const map = {
    music: [
      { title: 'Playback', keys: ['play', 'search', 'pause', 'resume', 'skip', 'stop', 'seek', 'volume', 'np', 'trackinfo', 'voteskip'] },
      { title: 'Queue', keys: ['queue', 'shuffle', 'move', 'remove', 'jump'] },
      { title: 'Effects', keys: ['filters', 'autoplay'] }
    ],
    playlist: [
      { title: 'Manage', keys: ['playlist', 'createplaylist', 'deleteplaylist', 'myplaylists', 'allplaylists'] },
      { title: 'Songs', keys: ['addsong', 'deletesong', 'showsongs'] },
      { title: 'Playback', keys: ['playcustomplaylist', 'savequeue'] }
    ],
    basic: [
      { title: 'General', keys: ['help', 'ping', 'stats', 'support'] }
    ],
    utility: [
      { title: 'Server', keys: ['language', '247'] },
      { title: 'Music Tools', keys: ['history'] }
    ]
  };

  if (map[categoryKey]) return map[categoryKey];

  // Si creas una carpeta nueva (ej. 'moderacion'), se agrupará aquí automáticamente
  return [
    { title: 'General', keys: commands.map(cmd => cmd.data.name) }
  ];
}

function renderCategoryTree(categoryKey, commands, commandMentionMap) {
  const sections = getCategorySections(categoryKey, commands);
  const commandMap = new Map(commands.map((cmd) => [cmd.data.name, cmd]));
  const consumed = new Set();
  const lines = [];

  for (const section of sections) {
    const found = section.keys.filter((name) => commandMap.has(name));
    if (!found.length) continue;
    found.forEach((name) => consumed.add(name));

    lines.push(`**${section.title} (${found.length})**`);
    lines.push(found.map((name) => getCommandRef(name, commandMentionMap)).join('  '));
    lines.push('');
  }

  const extra = commands
    .map((cmd) => cmd.data.name)
    .filter((name) => !consumed.has(name));

  if (extra.length) {
    lines.push(`**Extra (${extra.length})**`);
    lines.push(extra.map((name) => getCommandRef(name, commandMentionMap)).join('  '));
  }

  return lines.length ? lines.join('\n').trim() : '`No commands available.`';
}

function buildCategoryBody(lang, groupedCommands, categoryKey, commandMentionMap) {
  const categoryMeta = getCategoryMeta(lang, categoryKey);
  const commands = groupedCommands[categoryKey] || [];
  const sortedCommands = [...commands].sort((a, b) => a.data.name.localeCompare(b.data.name));
  const tree = sortedCommands.length
    ? renderCategoryTree(categoryKey, sortedCommands, commandMentionMap)
    : '`No commands available in this category.`';

  return [
    `${categoryMeta.description}`,
    `### ${categoryMeta.emoji || getEmoji('folder')} Commands\n${tree}`,
    `${getEmoji('search')} Select a command below to view details.`
  ];
}

function buildCommandDetailsBody(lang, categoryKey, command, commandMentionMap) {
  const categoryMeta = getCategoryMeta(lang, categoryKey);
  const json = command.data.toJSON();
  const commandRef = getCommandRef(json.name, commandMentionMap);
  const options = (json.options || [])
    .map((opt) => `• \`${opt.name}\`: ${opt.description || 'No description'}`)
    .join('\n');

  return [
    `${getEmoji('commands')} **/${json.name}**\n${json.description || 'No description available.'}`,
    [
      `### ${categoryMeta.emoji || '📁'} Category`,
      `• ${categoryMeta.name}`,
      `• Run: ${commandRef}`
    ].join('\n'),
    `### ${getEmoji('settings')} Options\n${options || '`No options for this command.`'}`
  ];
}

function buildExpiredBody(client) {
  const sample = ['help', 'ping', 'stats', 'support', 'play'].map((c) => `\`${c}\``).join(', ');
  return [
    `${getEmoji('warning')} **This interaction expired**\nRun the command again to open a fresh help panel.`,
    `${getEmoji('commands')} Quick commands: ${sample}`
  ];
}

function sendHelpResponse(interaction, components) {
  const response = {
    components,
    flags: MessageFlags.IsComponentsV2
  };

  if (interaction.deferred || interaction.replied) {
    return interaction.editReply(response);
  }

  if (interaction.isButton?.() || interaction.isStringSelectMenu?.()) {
    return interaction.update(response);
  }

  return interaction.reply(response);
}

async function showMainMenu(client, interaction) {
  const lang = await getLang(interaction.guildId).catch(() => ({}));
  const groupedCommands = groupCommandsByCategory(client);
  const commandMentionMap = await getCommandMentionMap(client, interaction);
  const banner = buildHelpBanner();
  const card = buildCard(
    `${getEmoji('help')} ${client.user?.username || 'Prime Music'} Help Section`,
    buildMainBody(client, lang, groupedCommands, commandMentionMap),
    [buildCategorySelect('main')],
    banner
  );

  return sendHelpResponse(interaction, [card]);
}

async function showCategoryPage(client, interaction, categoryKey) {
  const lang = await getLang(interaction.guildId).catch(() => ({}));
  const groupedCommands = groupCommandsByCategory(client);
  const commandMentionMap = await getCommandMentionMap(client, interaction);
  const banner = buildHelpBanner();
  
  const safeCategory = availableFolders.includes(categoryKey) ? categoryKey : 'basic';
  const categoryCommands = [...(groupedCommands[safeCategory] || [])].sort((a, b) => a.data.name.localeCompare(b.data.name));
  
  const actionRows = [buildCategorySelect(safeCategory)];
  if (categoryCommands.length) {
    actionRows.push(buildCommandSelect(safeCategory, categoryCommands));
  }
  actionRows.push(buildControlsRow('help_back_overview'));

  const meta = getCategoryMeta(lang, safeCategory);
  const card = buildCard(
    `${meta.emoji || '📁'} ${meta.name}`,
    buildCategoryBody(lang, groupedCommands, safeCategory, commandMentionMap),
    actionRows,
    banner
  );

  return sendHelpResponse(interaction, [card]);
}

async function showCommandDetails(client, interaction, categoryKey, commandName) {
  const lang = await getLang(interaction.guildId).catch(() => ({}));
  const groupedCommands = groupCommandsByCategory(client);
  const commandMentionMap = await getCommandMentionMap(client, interaction);
  const banner = buildHelpBanner();
  
  const safeCategory = availableFolders.includes(categoryKey) ? categoryKey : 'basic';
  const categoryCommands = [...(groupedCommands[safeCategory] || [])].sort((a, b) => a.data.name.localeCompare(b.data.name));
  const command = categoryCommands.find((cmd) => cmd.data.name === commandName);

  if (!command) {
    return showCategoryPage(client, interaction, safeCategory);
  }

  const actionRows = [
    buildCategorySelect(safeCategory),
    buildCommandSelect(safeCategory, categoryCommands),
    buildControlsRow(`help_back_cat_${safeCategory}`)
  ];

  const card = buildCard(
    `${getEmoji('commands')} Command Details`,
    buildCommandDetailsBody(lang, safeCategory, command, commandMentionMap),
    actionRows,
    banner
  );

  return sendHelpResponse(interaction, [card]);
}

async function showExpired(client, interaction) {
  const banner = buildHelpBanner();
  const card = buildCard(
    'Bot Information',
    buildExpiredBody(client),
    [],
    banner
  );

  return sendHelpResponse(interaction, [card]);
}

async function renderFromSelection(client, interaction, selectedCategory) {
  if (selectedCategory === 'main' || selectedCategory === 'home' || selectedCategory === 'overview') {
    return showMainMenu(client, interaction);
  }

  return showCategoryPage(client, interaction, selectedCategory);
}

async function handleComponent(client, interaction) {
  const customId = interaction.customId;

  if (customId === 'help_close') {
    return showExpired(client, interaction);
  }

  if (customId === 'help_back_main' || customId === 'help_back_overview' || customId === 'help_home') {
    return showMainMenu(client, interaction);
  }

  if (customId.startsWith('help_back_cat_')) {
    const category = customId.replace('help_back_cat_', '');
    return showCategoryPage(client, interaction, category);
  }

  if (customId === 'help_category_select') {
    const selectedCategory = interaction.values[0];
    return renderFromSelection(client, interaction, selectedCategory);
  }

  if (customId.startsWith('help_select_')) {
    const category = customId.replace('help_select_', '');
    const commandName = interaction.values[0];
    return showCommandDetails(client, interaction, category, commandName);
  }
}

module.exports = {
  data: data,
  helpers: {
    showMainMenu,
    showCategoryPage,
    showCommandDetails,
    showExpired,
    renderFromSelection,
    handleComponent,
    groupCommandsByCategory
  },
  run: async (client, interaction) => {
    try {
      const deferred = await safeDeferReply(interaction);
      if (!deferred && !interaction.deferred && !interaction.replied) return;
      const selectedCategory = interaction.options.getString('category') || 'main';

      return renderFromSelection(client, interaction, selectedCategory);
    } catch (e) {
      return handleCommandError(
        interaction,
        e,
        'help',
        '## ❌ Help Error\n\nFailed to load the help interface. Please try again later.'
      );
    }
  },
};