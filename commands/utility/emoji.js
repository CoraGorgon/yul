const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { safeDeferReply, handleCommandError } = require('../../utils/responseHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('emoji')
    .setDescription('show all emojis for the server'),

  run: async (client, interaction) => {
    try {
      await interaction.deferReply();

        const guild = interaction.guild;
        let Emojis = "";
        let EmojisAnimated = "";
        let EmojiCount = 0;
        let Animated = 0;
        let OverallEmojis = 0;

        guild.emojis.cache.forEach((emoji) => {
            OverallEmojis++;
            if (emoji.animated) {
                Animated++;
                EmojisAnimated += emoji.toString();
            } else {
                EmojiCount++;
                Emojis += emoji.toString();
            }
        });

        // Construcción del Embed
        const embed = new EmbedBuilder()
            .setColor('#000000') // Color negro
            .setTitle(`Emojis de ${guild.name} | [${OverallEmojis}]`)
            .setDescription(
                `**Animados [${Animated}]:**\n${EmojisAnimated || 'Ninguno'}\n\n` +
                `**No Animados [${EmojiCount}]:**\n${Emojis || 'Ninguno'}`
            )
            .setTimestamp()
            .setFooter({ text: 'Yul DS // Sistema de Emojis' });

        // Validación de límite de caracteres de Discord (4096)
        if (embed.data.description.length > 4096) {
            return await interaction.editReply("❌ El servidor tiene demasiados emojis para mostrarlos en un solo mensaje.");
        }

        // Botones de acción
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel("Invite")
                .setStyle(ButtonStyle.Link)
                .setURL("https://discord.com/api/oauth2/authorize?client_id=1517975340549410816&permissions=281474980153408&integration_type=0&scope=bot")
                .setEmoji("935305026048495638"),
            new ButtonBuilder()
                .setLabel("Support Server")
                .setStyle(ButtonStyle.Link)
                .setURL("https://discord.gg/Ze5TEDCD")
                .setEmoji("935305070852050965")
        );

        await interaction.editReply({ embeds: [embed], components: [row] });

    } catch (e) {
      return handleCommandError(
        interaction,
        e,
        'Error',
        `<a:3516scubbacat:1518088973845532862> \`|\` Hubo un error!! ${e}`
      );
    }
  },
};