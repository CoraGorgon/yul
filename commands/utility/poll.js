const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { safeDeferReply, handleCommandError } = require('../../utils/responseHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a professional poll with a visual progress bar.')
    .addStringOption(option => option.setName('question').setDescription('The poll question').setRequired(true))
        .addStringOption(option => option.setName('options').setDescription('Options separated by comma (max 5)').setRequired(true))
        .addStringOption(option => option.setName('unit').setDescription('Time unit')
            .addChoices(
                { name: 'Seconds', value: 'seconds' },
                { name: 'Minutes', value: 'minutes' },
                { name: 'Hours', value: 'hours' }
            ).setRequired(true))
        .addIntegerOption(option => option.setName('amount').setDescription('Time amount').setRequired(true)),

  run: async (client, interaction) => {
    try {
      
if (!interaction.deferred && !interaction.replied) {
                await interaction.deferReply();
            }

            const question = interaction.options.getString('question');
            const options = interaction.options.getString('options').split(',').map(o => o.trim()).slice(0, 5);
            const amount = interaction.options.getInteger('amount');
            const unit = interaction.options.getString('unit');

            // Time calculation
            const multipliers = { seconds: 1, minutes: 60, hours: 3600 };
            const durationInSeconds = amount * multipliers[unit];
            
            const startTime = Date.now();
            const endTime = startTime + (durationInSeconds * 1000);

            const userVotes = new Map();
            const voteCounts = new Array(options.length).fill(0);

            const generateBar = (index, total) => {
                const count = voteCounts[index];
                const percentage = total === 0 ? 0 : (count / total) * 100;
                const filled = Math.round(percentage / 10);
                return `\`${"█".repeat(filled)}${"░".repeat(10 - filled)}\` ${Math.round(percentage)}% (${count})`;
            };

            const createEmbed = (total, ended = false) => {
                return new EmbedBuilder()
                    .setTitle(ended ? `🏁 POLL RESULTS: ${question}` : `📊 POLL: ${question}`)
                    .setColor(ended ? '#ED4245' : '#5865F2') // Red for end, Discord Blurple for active
                    .setDescription(
                        `**Started:** <t:${Math.floor(startTime / 1000)}:R>\n` +
                        `**Ends:** <t:${Math.floor(endTime / 1000)}:R>\n\n` +
                        options.map((op, i) => `🔹 **${op}**\n${generateBar(i, total)}`).join('\n\n')
                    )
                    .setFooter({ text: ended ? 'Poll Closed' : 'Vote using the buttons below | Yul DS' });
            };

            const buttons = new ActionRowBuilder().addComponents(
                options.map((op, index) => 
                    new ButtonBuilder()
                        .setCustomId(`poll_${index}`)
                        .setLabel(op)
                        .setStyle(ButtonStyle.Primary)
                )
            );

            const response = await interaction.editReply({ embeds: [createEmbed(0)], components: [buttons] });

            const collector = response.createMessageComponentCollector({ 
                componentType: ComponentType.Button, 
                time: durationInSeconds * 1000 
            });

            collector.on('collect', async i => {
                const index = parseInt(i.customId.split('_')[1]);
                const prevVote = userVotes.get(i.user.id);
                
                if (prevVote !== undefined) voteCounts[prevVote]--;
                voteCounts[index]++;
                userVotes.set(i.user.id, index);
                
                const total = voteCounts.reduce((a, b) => a + b, 0);
                await i.update({ embeds: [createEmbed(total)] });
            });

            collector.on('end', async () => {
                const total = voteCounts.reduce((a, b) => a + b, 0);
                const disabledButtons = buttons.components.map(b => ButtonBuilder.from(b).setDisabled(true));
                await interaction.editReply({ 
                    embeds: [createEmbed(total, true)], 
                    components: [new ActionRowBuilder().addComponents(disabledButtons)] 
                });
            });
        
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