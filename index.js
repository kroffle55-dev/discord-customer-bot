const { Client, GatewayIntentBits, Events } = require('discord.js');
const express = require('express');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: ['CHANNEL']
});

const app = express();
app.get('/', (req, res) => res.send('Bot is running'));
app.listen(3000, () => console.log('Web server running on port 3000'));

client.once(Events.ClientReady, () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.content === '.고객센터설치') {
    await message.channel.send({
      content: '**📩 고객센터 안내**\n문의사항이 있으시면 아래 버튼을 눌러주세요.',
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              label: '문의하기',
              style: 1,
              custom_id: 'open_modal'
            }
          ]
        }
      ]
    });
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isButton() && interaction.customId === 'open_modal') {
    await interaction.showModal({
      title: '문의 접수',
      custom_id: 'modal_support',
      components: [
        {
          type: 1,
          components: [
            {
              type: 4,
              custom_id: 'subject',
              label: '문의 제목',
              style: 1,
              required: true
            }
          ]
        },
        {
          type: 1,
          components: [
            {
              type: 4,
              custom_id: 'content',
              label: '문의 내용',
              style: 2,
              required: true
            }
          ]
        }
      ]
    });
  }

  if (interaction.isModalSubmit() && interaction.customId === 'modal_support') {
    const subject = interaction.fields.getTextInputValue('subject');
    const content = interaction.fields.getTextInputValue('content');

    await interaction.reply({
      content: '✅ 문의가 정상적으로 접수되었습니다. 빠른 시일 내에 답변드릴게요!',
      ephemeral: true
    });

    const logChannel = await client.channels.fetch('1425412015198965872');
    await logChannel.send({
      content: `📬 **새로운 문의 접수됨**\n━━━━━━━━━━━━━━━━━━\n**제목:** ${subject}\n**내용:** ${content}\n**작성자:** <@${interaction.user.id}>`,
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              label: '답변하기',
              style: 1,
              custom_id: `reply_${interaction.user.id}`
            },
            {
              type: 2,
              label: '삭제하기',
              style: 4,
              custom_id: `delete_${interaction.user.id}`
            }
          ]
        }
      ]
    });
  }

  if (interaction.isButton()) {
    const [action, userId] = interaction.customId.split('_');
    const targetMessage = await interaction.message.fetch();

    if (action === 'reply') {
      await interaction.showModal({
        title: '답변 작성',
        custom_id: `modal_reply_${userId}`,
        components: [
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: 'reply_content',
                label: '답변 내용',
                style: 2,
                required: true
              }
            ]
          }
        ]
      });
    }

    if (action === 'delete') {
      await targetMessage.delete();

      const logChannel = await client.channels.fetch('1425412015198965872');
      await logChannel.send({
        content: `🗑️ 해당 문의는 관리자에 의해 삭제되었습니다.\n━━━━━━━━━━━━━━━━━━\n**작성자:** <@${userId}>`
      });

      await client.users.send(userId, {
        content: '📪 문의가 관리자에 의해 삭제되었습니다. 감사합니다!'
      });
    }
  }

  if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_reply_')) {
    const userId = interaction.customId.split('_')[2];
    const replyContent = interaction.fields.getTextInputValue('reply_content');

    await interaction.reply({
      content: '✅ 답변이 전송되었습니다.',
      ephemeral: true
    });

    await client.users.send(userId, {
      content: `📢 고객센터 답변입니다:\n━━━━━━━━━━━━━━━━━━\n${replyContent}`
    });
  }
});

client.login(process.env.TOKEN);
