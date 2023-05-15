import { IconClearAll } from '@tabler/icons-react';
import {
  type MutableRefObject,
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react';
import toast from 'react-hot-toast';

import {
  saveConversation,
  saveConversations
} from '@/utils/app/conversation';
import { throttle } from '@/utils/data/throttle';

import { type Conversation, type Message } from '@/types/chat';

import HomeContext from '@/pages/api/home/home.context';

import Spinner from '../Spinner';
import { ChatInput } from './ChatInput';
import { ChatLoader } from './ChatLoader';
import { ErrorMessageDiv } from './ErrorMessageDiv';
import { MemoizedChatMessage } from './MemoizedChatMessage';
import { Instruction } from './Instruction';

interface Props {
  stopConversationRef: MutableRefObject<boolean>
}

export const Chat = memo(({ stopConversationRef }: Props) => {
  const {
    state: {
      selectedConversation,
      conversations,
      models,
      apiKey,
      pluginKeys,
      serverSideApiKeyIsSet,
      modelError,
      loading,
      prompts
    },
    handleUpdateConversation,
    dispatch: homeDispatch
  } = useContext(HomeContext);

  const [currentMessage, setCurrentMessage] = useState<Message>();
  const [autoScrollEnabled, setAutoScrollEnabled] = useState<boolean>(true);
  const [showScrollDownButton, setShowScrollDownButton] =
    useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleUpdateMessage = useCallback(async (message: Message, messageIndex: number) => {
    if (selectedConversation) {
      const updatedMessages = [...selectedConversation.messages];
      updatedMessages[messageIndex] = message;
      const updatedConversation = {
        ...selectedConversation,
        messages: [...updatedMessages]
      };
      const updatedConversations: Conversation[] = conversations.map(
        (conversation) => {
          if (conversation.id === selectedConversation.id) {
            return updatedConversation;
          }
          return conversation;
        }
      );
      if (updatedConversations.length === 0) {
        updatedConversations.push(updatedConversation);
      }
      homeDispatch({ field: 'conversations', value: updatedConversations });
      homeDispatch({
        field: 'selectedConversation',
        value: updatedConversation
      });
      saveConversation(updatedConversation);
      saveConversations(updatedConversations);
    }
  },
  [
    conversations,
    selectedConversation,
    stopConversationRef
  ]
  );

  const handleSend = useCallback(
    async (
      message: Message,
      deleteCount = 0,
      messageIndex: number | null = null,
      providedAssumptions: string | null = null
    ) => {
      if (selectedConversation) {
        let updatedConversation: Conversation;
        if (deleteCount) {
          const updatedMessages = [...selectedConversation.messages];
          for (let i = 0; i < deleteCount; i++) {
            updatedMessages.pop();
          }
          updatedConversation = {
            ...selectedConversation,
            messages: [...updatedMessages, message]
          };
        } else if (messageIndex == null) {
          updatedConversation = {
            ...selectedConversation,
            messages: [...selectedConversation.messages, message]
          };
        } else {
          updatedConversation = {
            ...selectedConversation,
            messages: selectedConversation.messages
          }
        }
        homeDispatch({
          field: 'selectedConversation',
          value: updatedConversation
        });
        homeDispatch({ field: 'loading', value: true });
        homeDispatch({ field: 'messageIsStreaming', value: true });

        const controller = new AbortController();
        const response = await fetch('api/dsensei/answer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          signal: controller.signal,
          body: JSON.stringify({
            question: message.content,
            // TODO: Temp fix
            conversationId: providedAssumptions != null ? `${selectedConversation.id}-${new Date().getTime()}` : selectedConversation.id,
            providedAssumptions
          })
        });
        if (!response.ok) {
          homeDispatch({ field: 'loading', value: false });
          homeDispatch({ field: 'messageIsStreaming', value: false });
          toast.error(response.statusText);
          return;
        }
        const data = response.body;
        if (!data) {
          homeDispatch({ field: 'loading', value: false });
          homeDispatch({ field: 'messageIsStreaming', value: false });
          return;
        }

        const senseiResponse = await response.json();
        const responseMessage: Message = { role: 'assistant', content: JSON.stringify({ senseiResponse }) };
        const updatedMessages: Message[] = [...updatedConversation.messages];
        if (messageIndex == null) {
          updatedMessages.push(responseMessage);
        } else {
          updatedMessages[messageIndex] = responseMessage;
        }
        updatedConversation = {
          ...updatedConversation,
          messages: updatedMessages
        };
        homeDispatch({
          field: 'selectedConversation',
          value: updatedConversation
        });
        saveConversation(updatedConversation);
        const updatedConversations: Conversation[] = conversations.map(
          (conversation) => {
            if (conversation.id === selectedConversation.id) {
              return updatedConversation;
            }
            return conversation;
          }
        );
        if (updatedConversations.length === 0) {
          updatedConversations.push(updatedConversation);
        }
        homeDispatch({ field: 'conversations', value: updatedConversations });
        saveConversations(updatedConversations);
        homeDispatch({ field: 'loading', value: false });
        homeDispatch({ field: 'messageIsStreaming', value: false });
      }
    },
    [
      apiKey,
      conversations,
      pluginKeys,
      selectedConversation,
      stopConversationRef
    ]
  );

  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } =
        chatContainerRef.current;
      const bottomTolerance = 30;

      if (scrollTop + clientHeight < scrollHeight - bottomTolerance) {
        setAutoScrollEnabled(false);
        setShowScrollDownButton(true);
      } else {
        setAutoScrollEnabled(true);
        setShowScrollDownButton(false);
      }
    }
  };

  const handleScrollDown = () => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: 'smooth'
    });
  };

  const handleShowSchemasDialog = () => {
    homeDispatch({
      field: 'showSchemasDialog',
      value: true
    });
  };

  const onClearAll = () => {
    if (
      confirm('Are you sure you want to clear all messages?') &&
      selectedConversation
    ) {
      handleUpdateConversation(selectedConversation, {
        key: 'messages',
        value: []
      });
    }
  };

  const scrollDown = () => {
    if (autoScrollEnabled) {
      messagesEndRef.current?.scrollIntoView(true);
    }
  };
  const throttledScrollDown = throttle(scrollDown, 250);

  // useEffect(() => {
  //   console.log('currentMessage', currentMessage);
  //   if (currentMessage) {
  //     handleSend(currentMessage);
  //     homeDispatch({ field: 'currentMessage', value: undefined });
  //   }
  // }, [currentMessage]);

  useEffect(() => {
    throttledScrollDown();
    selectedConversation &&
      setCurrentMessage(
        selectedConversation.messages[selectedConversation.messages.length - 2]
      );
  }, [selectedConversation, throttledScrollDown]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setAutoScrollEnabled(entry.isIntersecting);
        if (entry.isIntersecting) {
          textareaRef.current?.focus();
        }
      },
      {
        root: null,
        threshold: 0.5
      }
    );
    const messagesEndElement = messagesEndRef.current;
    if (messagesEndElement) {
      observer.observe(messagesEndElement);
    }
    return () => {
      if (messagesEndElement) {
        observer.unobserve(messagesEndElement);
      }
    };
  }, [messagesEndRef]);

  return (
    <div className="relative flex-1 overflow-hidden bg-white dark:bg-[#343541]">
      {!(apiKey || serverSideApiKeyIsSet)
        ? (
          <div className="mx-auto flex h-full w-[300px] flex-col justify-center space-y-6 sm:w-[600px]">
            <div className="text-center text-4xl font-bold text-black dark:text-white">
              Welcome to Chatbot UI
            </div>
            <div className="text-center text-lg text-black dark:text-white">
              <div className="mb-8">{'Chatbot UI is an open source clone of OpenAI\'s ChatGPT UI.'}</div>
              <div className="mb-2 font-bold">
                Important: Chatbot UI is 100% unaffiliated with OpenAI.
              </div>
            </div>
            <div className="text-center text-gray-500 dark:text-gray-400">
              <div className="mb-2">
                Chatbot UI allows you to plug in your API key to use this UI with
                their API.
              </div>
              <div className="mb-2">
                It is <span className="italic">only</span> used to communicate
                with their API.
              </div>
              <div className="mb-2">
                Please set your OpenAI API key in the bottom left of the sidebar.
              </div>
              <div>
                If you don't have an OpenAI API key, you can get one here:
                <a
                  href="https://platform.openai.com/account/api-keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  openai.com
                </a>
              </div>
            </div>
          </div>
          )
        : modelError
          ? (
            <ErrorMessageDiv error={modelError} />
            )
          : (
            <>
              <div
                className="max-h-full overflow-x-hidden"
                ref={chatContainerRef}
                onScroll={handleScroll}
              >
                {selectedConversation?.messages.length === 0
                  ? (
                    <>
                      <div className="mx-auto flex flex-col space-y-5 md:space-y-10 px-3 pt-5 md:pt-12 sm:max-w-[600px]">
                        <div className="text-center text-3xl font-semibold text-gray-800 dark:text-gray-100">
                          {models.length === 0
                            ? (
                              <div>
                                <Spinner size="16px" className="mx-auto" />
                              </div>
                              )
                            : (
                                'Chatbot UI'
                              )}
                        </div>

                        {models.length > 0 && <Instruction askQuestion={async (question: string) => {
                          await handleSend({ role: 'user', content: question });
                        }} />}
                      </div>
                    </>
                    )
                  : (
                    <>
                      <div className="sticky top-0 z-10 flex justify-center border border-b-neutral-300 bg-neutral-100 py-2 text-sm text-neutral-500 dark:border-none dark:bg-[#444654] dark:text-neutral-200">
                        {'Model'}: {selectedConversation?.model.name} | <button className='px-1' onClick={handleShowSchemasDialog}>Show Schemas</button> |
                        <button
                          className="ml-2 cursor-pointer hover:opacity-50"
                          onClick={onClearAll}
                        >
                          <IconClearAll size={18} />
                        </button>
                      </div>

                      {selectedConversation?.messages.map((message, index) => (
                        <MemoizedChatMessage
                          key={index}
                          message={message}
                          messageIndex={index}
                          onUpdateUserMessage={async (editedMessage) => {
                            setCurrentMessage(editedMessage);
                            // discard edited message and the ones that come after then resend
                            await handleSend(
                              editedMessage,
                              selectedConversation?.messages.length - index
                            );
                          }}
                          onUpdateAssistantMessage={async (editedMessage) => {
                            setCurrentMessage(editedMessage);
                            await handleUpdateMessage(
                              editedMessage,
                              index
                            )
                          }}
                          onUpdateAssumptions={
                            async (message: Message, updatedAssumptions: string) => {
                              await handleSend(
                                message,
                                0,
                                index,
                                updatedAssumptions
                              )
                            }}
                        />
                      ))}

                      {loading && <ChatLoader />}

                      <div
                        className="h-[162px] bg-white dark:bg-[#343541]"
                        ref={messagesEndRef}
                      />
                    </>
                    )}
              </div>

              <ChatInput
                stopConversationRef={stopConversationRef}
                textareaRef={textareaRef}
                onSend={async (message) => {
                  setCurrentMessage(message);
                  await handleSend(message, 0);
                }}
                onScrollDownClick={handleScrollDown}
                onRegenerate={async () => {
                  if (currentMessage) {
                    await handleSend(currentMessage, 2);
                  }
                }}
                showScrollDownButton={showScrollDownButton}
              />
            </>
            )}
    </div>
  );
});
Chat.displayName = 'Chat';
