import React from 'react';
import { gql, useQuery } from '@apollo/client';
import styled from '@emotion/styled';
import { FormattedMessage, useIntl } from 'react-intl';

import { i18nGraphqlException } from '../../lib/errors';
import { API_V2_CONTEXT } from '../../lib/graphql/helpers';
import { VirtualCard as GraphQLVirtualCard, VirtualCardStatus } from '../../lib/graphql/types/v2/graphql';
import { getAvailableLimitShortString } from '../../lib/i18n/virtual-card-spending-limit';

import Avatar from '../Avatar';
import DateTime from '../DateTime';
import Drawer, { DrawerActions } from '../Drawer';
import EditVirtualCardModal from '../edit-collective/EditVirtualCardModal';
import { ActionsButton, CardContainer, CardDetails, StateLabel } from '../edit-collective/VirtualCard';
import { Box, Flex } from '../Grid';
import { I18nBold } from '../I18nFormatters';
import Link from '../Link';
import LinkCollective from '../LinkCollective';
import Loading from '../Loading';
import MessageBox from '../MessageBox';
import StyledButton from '../StyledButton';
import StyledHr from '../StyledHr';
import StyledLink from '../StyledLink';
import { H4, Span } from '../Text';
import { TOAST_TYPE, useToasts } from '../ToastProvider';

import { StripeVirtualCardComplianceStatement } from './StripeVirtualCardComplianceStatement';

type VirtualCardDrawerProps = {
  open: boolean;
  onClose: () => void;
  virtualCardId: string;
  canEditVirtualCard?: boolean;
  canDeleteVirtualCard?: boolean;
  onDeleteRefetchQuery?: string;
};

const virtualCardQuery = gql`
  query VirtualCard($virtualCard: VirtualCardReferenceInput!) {
    virtualCard(virtualCard: $virtualCard) {
      id
      name
      last4
      data
      privateData
      provider
      spendingLimitAmount
      spendingLimitInterval
      spendingLimitRenewsOn
      remainingLimit
      currency
      createdAt
      status
      account {
        id
        name
        slug
        imageUrl
      }
      assignee {
        id
        name
        email
        slug
        imageUrl
      }
      host {
        id
        slug
        stripe {
          username
        }
      }
    }
  }
`;

const InfoLabel = styled.p`
  color: var(--dark-700, #4d4f51);
  font-size: 12px;
  font-family: Inter;
  font-style: normal;
  font-weight: 500;
  line-height: 16px;
  letter-spacing: 0.72px;
  text-transform: uppercase;
`;

const InfoValue = styled.p`
  color: #4d4f51;
  font-size: 14px;
  font-family: Inter;
  font-style: normal;
  font-weight: 400;
  line-height: 20px;
`;

export default function VirtualCardDrawer(props: VirtualCardDrawerProps) {
  const intl = useIntl();
  const { addToast } = useToasts();

  const [isEditingVirtualCard, setIsEditingVirtualCard] = React.useState(false);

  const query = useQuery<{ virtualCard: GraphQLVirtualCard }>(virtualCardQuery, {
    context: API_V2_CONTEXT,
    skip: !props.open,
    variables: {
      virtualCard: {
        id: props.virtualCardId,
      },
    },
  });

  const handleEditSuccess = React.useCallback(
    message => {
      setIsEditingVirtualCard(false);
      addToast({
        type: TOAST_TYPE.SUCCESS,
        message: message,
      });
    },
    [addToast],
  );

  const { loading, data, error } = query;
  const virtualCard = data?.virtualCard;

  return (
    <Drawer
      maxWidth="512px"
      open={props.open}
      onClose={props.onClose}
      showActionsContainer
      data-cy="virtual-card-drawer"
    >
      {loading ? (
        <Loading />
      ) : error ? (
        <MessageBox type="error" withIcon mt={2}>
          {i18nGraphqlException(intl, error)}
        </MessageBox>
      ) : (
        virtualCard && (
          <React.Fragment>
            <H4 fontSize="20px" fontWeight="700">
              {virtualCard?.name}
            </H4>
            <Box my={3}>
              <StripeVirtualCardComplianceStatement />
            </Box>
            <CardContainer mt="24px" width="366px" height="248px" flexDirection="column">
              <div />
              <Box flexGrow={1} m="24px 24px 0 24px">
                <Flex fontSize="16px" lineHeight="24px" fontWeight="500" justifyContent="space-between">
                  <Box>{virtualCard.name}</Box>
                  {/* @ts-ignore */}
                  <StateLabel isActive={virtualCard.status === VirtualCardStatus.ACTIVE}>
                    {virtualCard.status}
                  </StateLabel>
                </Flex>
                <CardDetails virtualCard={virtualCard} />
              </Box>
            </CardContainer>

            <StyledHr my="32px" />

            <Flex flexDirection="column" gap="32px">
              <Box>
                <InfoLabel>
                  <FormattedMessage defaultMessage="Assigned to" />
                </InfoLabel>
                <Flex alignItems="center" gridGap={2}>
                  <Avatar collective={virtualCard.assignee} radius={24} />
                  <StyledLink
                    as={LinkCollective}
                    collective={virtualCard.assignee}
                    color="black.700"
                    truncateOverflow
                    textDecoration="underline"
                  />
                </Flex>
              </Box>
              <Box>
                <InfoLabel>
                  <FormattedMessage id="Collective" defaultMessage="Collective" />
                </InfoLabel>
                <Flex alignItems="center" gridGap={2}>
                  <Avatar collective={virtualCard.account} radius={24} />
                  <StyledLink
                    as={LinkCollective}
                    collective={virtualCard.account}
                    color="black.700"
                    truncateOverflow
                    textDecoration="underline"
                  />
                </Flex>
              </Box>
              <Flex gap="32px">
                <Box>
                  <InfoLabel>
                    <FormattedMessage id="agreement.createdOn" defaultMessage="Created on" />
                  </InfoLabel>
                  <InfoValue>
                    <DateTime dateStyle="medium" value={virtualCard.createdAt} />
                  </InfoValue>
                </Box>
                <Box>
                  <InfoLabel>
                    <FormattedMessage defaultMessage="Available balance" />
                  </InfoLabel>
                  <InfoValue>
                    {getAvailableLimitShortString(
                      intl,
                      virtualCard.currency,
                      virtualCard.remainingLimit,
                      virtualCard.spendingLimitAmount,
                      virtualCard.spendingLimitInterval,
                      {
                        AvailableAmount: I18nBold,
                        AmountSeparator: v => <strong>&nbsp;{v}&nbsp;</strong>,
                        LimitAmount: v => (
                          <Span fontSize="14px" fontWeight="normal" color="black.600" fontStyle="italic">
                            {v}
                          </Span>
                        ),
                        LimitInterval: v => (
                          <Span fontSize="14px" fontWeight="normal" color="black.600" fontStyle="italic">
                            {v}
                          </Span>
                        ),
                      },
                    )}
                  </InfoValue>
                </Box>
                {virtualCard.spendingLimitRenewsOn && (
                  <Box>
                    <InfoLabel>
                      <FormattedMessage defaultMessage="Renews on" />
                    </InfoLabel>
                    <InfoValue>
                      <DateTime dateStyle="medium" value={virtualCard.spendingLimitRenewsOn} />
                    </InfoValue>
                  </Box>
                )}
              </Flex>
            </Flex>
          </React.Fragment>
        )
      )}

      {virtualCard && props.open && (
        <DrawerActions>
          <Flex justifyContent="space-between" width="100%">
            <ActionsButton
              virtualCard={virtualCard}
              host={virtualCard.host}
              onError={error => addToast({ type: TOAST_TYPE.ERROR, message: i18nGraphqlException(intl, error) })}
              canDeleteVirtualCard={props.canDeleteVirtualCard}
              onDeleteRefetchQuery={props.onDeleteRefetchQuery}
              hideViewTransactions
              // eslint-disable-next-line react/display-name
              as={React.forwardRef((props, ref: React.ForwardedRef<HTMLButtonElement>) => {
                return (
                  <StyledButton {...props} ref={ref}>
                    <FormattedMessage defaultMessage="More actions" />
                  </StyledButton>
                );
              })}
            />

            <Flex gap="8px">
              <StyledButton
                as={Link}
                href={`/${virtualCard.account.slug}/transactions?virtualCard=${virtualCard?.id}`}
                buttonStyle="secondary"
              >
                <FormattedMessage defaultMessage="View transactions" />
              </StyledButton>
              <StyledButton buttonStyle="primary" onClick={() => setIsEditingVirtualCard(true)}>
                <FormattedMessage defaultMessage="Edit Card Details" />
              </StyledButton>
            </Flex>
          </Flex>
          {isEditingVirtualCard && (
            <EditVirtualCardModal
              host={virtualCard.host}
              onSuccess={handleEditSuccess}
              onClose={() => setIsEditingVirtualCard(false)}
              virtualCard={virtualCard}
            />
          )}
        </DrawerActions>
      )}
    </Drawer>
  );
}
