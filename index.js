const { Client, GatewayIntentBits, Events } = require('discord.js');
require('dotenv').config();
const express = require('express');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: ['CHANNEL']
});

client.once(Events.ClientReady, () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// .고객센터설치 명령어
client.on(Events.MessageCreate, async (message) => {
  if (message.content === '.고객센터설치') {
    // 기존 Embed를 컴포넌트 v2로 변경
    await message.channel.send({
      components: [
        {
          type: 20, // 텍스트 컴포넌트
          content: '**⚡️에이피 고객센터**'
        },
        {
          type: 22 // 구분선 컴포넌트
        },
        {
          type: 20, // 텍스트 컴포넌트
          content: '안녕하십니까, 에이피 입니다.\n아래 버튼을 통해 문의를 접수해주시면 지원팀이 신속히 도와드리겠습니다.\n감사합니다.'
        },
        {
            type: 20, // 텍스트 컴포넌트 (푸터 역할)
            content: '\n> ⚡️AP | 에이피 베이프'
        },
        {
          type: 1, // 액션 로우 (버튼을 담는 컨테이너)
          components: [
            {
              type: 2, // 버튼
              label: 'ℹ️ 문의하기',
              style: 2, // 회색 버튼
              custom_id: 'open_modal'
            }
          ]
        }
      ]
    });
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  // 고객 버튼 클릭 시 모달 열기
  if (interaction.isButton() && interaction.customId === 'open_modal') {
    await interaction.showModal({
      title: '문의 접수하기',
      custom_id: 'modal_support',
      components: [
        {
          type: 1,
          components: [
            {
              type: 4, custom_id: 'subject', label: '제목', style: 1, required: true
            }
          ]
        },
        {
          type: 1,
          components: [
            {
              type: 4, custom_id: 'content', label: '내용', style: 2, required: true
            }
          ]
        }
      ]
    });
  }

  // 문의 모달 제출
  if (interaction.isModalSubmit() && interaction.customId === 'modal_support') {
    const subject = interaction.fields.getTextInputValue('subject');
    const content = interaction.fields.getTextInputValue('content');

    await interaction.reply({
      content: '✅ 문의가 정상적으로 접수되었습니다.',
      ephemeral: true
    });

    const logChannel = await client.channels.fetch('1425412015198965872'); // 실제 로그 채널 ID로 변경하세요.

    // 관리자 채널에 보내는 메시지도 컴포넌트 v2로 변경
    await logChannel.send({
      components: [
        {
          type: 20,
          content: '**📥 새 문의가 접수되었습니다.**'
        },
        {
          type: 22
        },
        {
          type: 20,
          content: `**제목:** ${subject}\n**내용:** ${content}\n\n**작성자:** <@${interaction.user.id}>`
        },
        {
            type: 20,
            content: '\n> ⚡️AP | 에이피 베이프'
        },
        {
          type: 1,
          components: [
            {
              type: 3, // 드롭다운
              custom_id: `admin_action_${interaction.user.id}`,
              placeholder: '답변 작업관리',
              options: [
                {
                  label: '✅️ 답변 등록',
                  value: `reply_${interaction.user.id}`,
                  description: '문의에 대한 답변을 작성하여 보냅니다.'
                },
                {
                  label: '🔴 반려 처리',
                  value: `delete_${interaction.user.id}`,
                  description: '문의를 삭제하고 사용자에게 알립니다.'
                }
              ]
            }
          ]
        }
      ]
    });
  }

  // 관리자 드롭다운 선택
  if (interaction.isStringSelectMenu() && interaction.customId.startsWith('admin_action_')) {
    const selected = interaction.values[0];
    const [action, userId] = selected.split('_');
    const targetMessage = interaction.message; // fetch 불필요

    if (action === 'reply') {
      await interaction.showModal({
        title: '답변 작성',
        custom_id: `modal_reply_${userId}`,
        components: [
          {
            type: 1,
            components: [
              {
                type: 4, custom_id: 'reply_content', label: '답변 내용', style: 2, required: true
              }
            ]
          }
        ]
      });
    }

    if (action === 'delete') {
      await targetMessage.delete();

      // 사용자에게 보내는 반려 DM도 컴포넌트 v2로 개선
      await client.users.send(userId, {
        components: [
            {
                type: 20,
                content: '**🔴 문의 반려 안내**'
            },
            {
                type: 22
            },
            {
                type: 20,
                content: '귀하께서 접수하신 문의사항이 반려 처리되었습니다. \n자세한 내용은 관리자에게 문의해주시기 바랍니다.'
            },
            {
                type: 20,
                content: '\n> ⚡️AP | 에이피 베이프'
            }
        ]
      });
    }
  }

  // 답변 모달 제출
  if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_reply_')) {
    const userId = interaction.customId.split('_')[2];
    const replyContent = interaction.fields.getTextInputValue('reply_content');

    // 관리자 채널의 원래 메시지 삭제 (이미 interaction.message로 가져왔으므로 바로 사용)
    try {
      await interaction.message.delete();
    } catch (err) {
      console.error('관리자 채널의 원본 메시지 삭제에 실패했습니다:', err);
    }

    await interaction.reply({
      content: '✅ 답변이 등록되어 사용자에게 전송되었습니다.',
      ephemeral: true
    });

    // 사용자에게 보내는 답변 DM도 컴포넌트 v2로 개선
    await client.users.send(userId, {
        components: [
            {
                type: 20,
                content: '**✅ 문의에 대한 답변이 도착했습니다.**'
            },
            {
                type: 22
            },
            {
                type: 20,
                content: replyContent
            },
            {
                type: 20,
                content: '\n> ⚡️AP | 에이피 베이프'
            }
        ]
    });
  }
});

client.login(process.env.TOKEN);

// ✅ Koyeb용 웹 서버
const app = express();
app.get('/', (req, res) => res.send('Bot is running!'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Web server running on port ${PORT}`));
