import React from 'react';
import { gql, useQuery } from '@apollo/client';
import { DotsHorizontalRounded } from '@styled-icons/boxicons-regular/DotsHorizontalRounded';
import { themeGet } from '@styled-system/theme-get';
import { compact, isNil, mapValues, omitBy, pick, toNumber } from 'lodash';
import { useRouter } from 'next/router';
import { FormattedMessage, useIntl } from 'react-intl';
import styled from 'styled-components';

import { API_V2_CONTEXT } from '../../../lib/graphql/helpers';
import { BREAKPOINTS, useWindowResize } from '../../../lib/hooks/useWindowResize';

import Avatar from '../../Avatar';
import Container from '../../Container';
import { DataTable } from '../../DataTable';
import DateTime from '../../DateTime';
import EditOrderModal, { EditOrderActions } from '../../EditOrderModal';
import FormattedMoneyAmount from '../../FormattedMoneyAmount';
import { Box, Flex } from '../../Grid';
import LinkCollective from '../../LinkCollective';
import LoadingPlaceholder from '../../LoadingPlaceholder';
import MessageBoxGraphqlError from '../../MessageBoxGraphqlError';
import OrderStatusTag from '../../orders/OrderStatusTag';
import PaymentMethodTypeWithIcon from '../../PaymentMethodTypeWithIcon';
import PopupMenu from '../../PopupMenu';
import { managedOrderFragment } from '../../recurring-contributions/graphql/queries';
import SearchBar from '../../SearchBar';
import StyledButton from '../../StyledButton';
import StyledRoundButton from '../../StyledRoundButton';
import StyledTabs from '../../StyledTabs';
import { H1, P, Span } from '../../Text';
import { Pagination } from '../../ui/Pagination';
import { AdminSectionProps } from '../types';

enum ContributionsTab {
  RECURRING = 'RECURRING',
  ONETIME = 'ONETIME',
  CANCELED = 'CANCELED',
}

const DEFAULT_VARIABLES = {
  RECURRING: {
    onlyActiveSubscriptions: true,
    includeIncognito: true,
  },
  ONETIME: {
    includeIncognito: true,
    status: ['PAID'],
    frequency: 'ONETIME',
    minAmount: 1,
  },
  CANCELED: {
    includeIncognito: true,
    status: ['CANCELLED'],
    minAmount: 1,
  },
};

const manageContributionsQuery = gql`
  query DashboardRecurringContributions(
    $slug: String!
    $searchTerm: String
    $offset: Int
    $limit: Int
    $filter: AccountOrdersFilter!
    $frequency: ContributionFrequency
    $status: [OrderStatus!]
    $onlyActiveSubscriptions: Boolean
    $includeIncognito: Boolean
    $minAmount: Int
  ) {
    account(slug: $slug) {
      id
      legacyId
      slug
      name
      type
      settings
      imageUrl
      ... on AccountWithParent {
        parent {
          id
          slug
        }
      }
      orders(
        filter: $filter
        frequency: $frequency
        status: $status
        onlyActiveSubscriptions: $onlyActiveSubscriptions
        includeIncognito: $includeIncognito
        minAmount: $minAmount
        searchTerm: $searchTerm
        offset: $offset
        limit: $limit
      ) {
        totalCount
        nodes {
          id
          ...ManagedOrderFields
        }
      }
    }
  }
  ${managedOrderFragment}
`;

const ActionButton = styled.button`
  appearance: none;
  border: none;
  cursor: pointer;
  outline: 0;
  min-width: max-content;
  background: transparent;
  background-color: transparent;
  border: 0;
  padding: 8px 12px;
  margin: 0 8px;
  font-size: 13px;
  border-radius: 6px;
  white-space: nowrap;
  vertical-align: middle;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: ${props => props.color || props.theme.colors.black[800]};
  gap: 8px;
  cursor: pointer;
  &:hover {
    background-color: #f4f5f7;
    text-decoration: none;
    svg {
      color: #334155;
    }
  }

  svg {
    color: #94a3b8;
    height: 14px;
    width: 14px;
  }

  @media screen and (max-width: ${themeGet('breakpoints.0')}) {
    font-size: 16px;
    padding: 12px;

    svg {
      height: 16px;
      width: 16px;
    }
  }
`;

const getColumns = ({ tab, setEditOrder, intl, isIncoming }) => {
  const toAccount = {
    accessorKey: 'toAccount',
    header: intl.formatMessage({ id: 'Collective', defaultMessage: 'Collective' }),
    cell: ({ cell }) => {
      const toAccount = cell.getValue();
      return (
        <LinkCollective collective={toAccount}>
          <div className="flex max-w-[200px] items-center">
            <Avatar size={24} collective={toAccount} mr={2} />
            <Span as="span" truncateOverflow>
              {toAccount.name}
            </Span>
          </div>
        </LinkCollective>
      );
    },
  };
  const fromAccount = {
    accessorKey: 'fromAccount',
    header: intl.formatMessage({ id: 'Contributor', defaultMessage: 'Contributor' }),
    cell: ({ cell }) => {
      const fromAccount = cell.getValue();
      return (
        <LinkCollective collective={fromAccount}>
          <div className="flex max-w-[200px] items-center">
            <Avatar size={24} collective={fromAccount} mr={2} />
            <Span as="span" truncateOverflow>
              {fromAccount.name}
            </Span>
          </div>
        </LinkCollective>
      );
    },
  };
  const orderId = {
    accessorKey: 'legacyId',
    header: intl.formatMessage({ id: 'order.id', defaultMessage: 'Contribution #' }),
  };
  const paymentMethod = {
    accessorKey: 'paymentMethod',
    header: intl.formatMessage({ id: 'paymentmethod.label', defaultMessage: 'Payment Method' }),
    cell: ({ cell }) => {
      const pm = cell.getValue();
      if (pm) {
        return <PaymentMethodTypeWithIcon iconSize={18} type={pm.type} />;
      }
    },
  };
  const status = {
    accessorKey: 'status',
    header: intl.formatMessage({ id: 'order.status', defaultMessage: 'Status' }),
    cell: ({ cell }) => {
      const status = cell.getValue();
      return (
        <Flex>
          <OrderStatusTag status={status} />
        </Flex>
      );
    },
  };

  if (tab === ContributionsTab.ONETIME) {
    return [
      isIncoming ? fromAccount : toAccount,
      orderId,
      paymentMethod,
      {
        accessorKey: 'amount',
        header: intl.formatMessage({ id: 'Fields.amount', defaultMessage: 'Amount' }),
        cell: ({ cell }) => {
          const amount = cell.getValue();
          return <FormattedMoneyAmount amount={amount.valueInCents} currency={amount.currency} />;
        },
      },
      {
        accessorKey: 'createdAt',
        header: intl.formatMessage({ id: 'expense.incurredAt', defaultMessage: 'Date' }),
        cell: ({ cell }) => {
          const date = cell.getValue();
          return <DateTime value={date} dateStyle="medium" timeStyle={undefined} />;
        },
      },
      status,
    ];
  } else if ([ContributionsTab.RECURRING, ContributionsTab.CANCELED].includes(tab)) {
    const amount = {
      accessorKey: 'amount',
      header: intl.formatMessage({ id: 'Fields.amount', defaultMessage: 'Amount' }),
      cell: ({ cell, row }) => {
        const amount = cell.getValue();
        const order = row.original;
        return (
          <FormattedMoneyAmount amount={amount.valueInCents} currency={amount.currency} frequency={order.frequency} />
        );
      },
    };
    const totalDonations = {
      accessorKey: 'totalDonations',
      header: intl.formatMessage({ id: 'TotalDonated', defaultMessage: 'Total Donated' }),
      cell: ({ cell }) => {
        const amount = cell.getValue();
        return <FormattedMoneyAmount amount={amount.valueInCents} currency={amount.currency} />;
      },
    };
    const processedAt = {
      accessorKey: 'processedAt',
      header: intl.formatMessage({ id: 'LastCharge', defaultMessage: 'Last Charge' }),
      cell: ({ cell }) => {
        const date = cell.getValue();
        if (date) {
          return <DateTime value={date} dateStyle="medium" timeStyle={undefined} />;
        }
      },
    };

    if (tab === ContributionsTab.RECURRING) {
      const actions = {
        header: intl.formatMessage({ id: 'CollectivePage.NavBar.ActionMenu.Actions', defaultMessage: 'Actions' }),
        cell: ({ row }) => {
          const order = row.original;
          return (
            <Flex justifyContent="center">
              <PopupMenu
                placement="bottom-start"
                Button={({ onClick }) => (
                  <StyledRoundButton data-cy="actions" size={32} onClick={onClick} buttonSize="small">
                    <DotsHorizontalRounded size="24px" color={themeGet('colors.black.600')} />
                  </StyledRoundButton>
                )}
              >
                {() => (
                  <Flex flexDirection="column">
                    <ActionButton onClick={() => setEditOrder({ order, action: 'editPaymentMethod' })}>
                      <FormattedMessage
                        id="subscription.menu.editPaymentMethod"
                        defaultMessage="Update payment method"
                      />
                    </ActionButton>
                    <ActionButton onClick={() => setEditOrder({ order, action: 'editAmount' })}>
                      <FormattedMessage id="subscription.menu.updateAmount" defaultMessage="Update amount" />
                    </ActionButton>
                    <ActionButton
                      onClick={() => setEditOrder({ order, action: 'cancel' })}
                      color={themeGet('colors.red.600')}
                    >
                      <FormattedMessage
                        id="subscription.menu.cancelContribution"
                        defaultMessage="Cancel contribution"
                      />
                    </ActionButton>
                  </Flex>
                )}
              </PopupMenu>
            </Flex>
          );
        },
      };
      return compact([
        isIncoming ? fromAccount : toAccount,
        orderId,
        paymentMethod,
        amount,
        totalDonations,
        processedAt,
        status,
        isIncoming ? null : actions,
      ]);
    } else {
      return [
        isIncoming ? fromAccount : toAccount,
        orderId,
        paymentMethod,
        amount,
        totalDonations,
        processedAt,
        status,
      ];
    }
  }
};

export const cardColumns = ({ tab, setEditOrder, isIncoming }) => [
  {
    accessorKey: 'summary',
    header: null,
    cell: ({ row }) => {
      const order = row.original;
      const account = isIncoming ? order.fromAccount : order.toAccount;
      return (
        <Flex alignItems="center" gap="16px">
          <LinkCollective collective={account}>
            <Avatar collective={account} radius={40} />
          </LinkCollective>
          <Flex flexDirection="column" gap="8px" flexGrow={1}>
            <Flex justifyContent={['flex-start', 'space-between']} gap="8px" alignItems="baseline">
              <P fontSize="13px" fontWeight="400">
                <FormattedMessage id="order.id" defaultMessage="Contribution #" />
                {order.legacyId}
              </P>
              <Flex
                alignItems={['flex-end', 'center']}
                flexDirection={['column', 'row']}
                gap="16px"
                justifyContent={['space-between', 'flex-end']}
                flexGrow={1}
              >
                {order.frequency && order.processedAt && (
                  <P fontSize="13px" fontWeight="400" display={['none', 'block']}>
                    <FormattedMessage defaultMessage="Last charge" />
                    :&nbsp;
                    <DateTime value={order.processedAt} dateStyle="medium" timeStyle={undefined} />
                  </P>
                )}
                <OrderStatusTag status={order.status} />
                <P fontSize="16px">
                  <FormattedMoneyAmount
                    amount={order.amount.valueInCents}
                    currency={order.amount.currency}
                    frequency={order.frequency}
                  />
                </P>
              </Flex>
            </Flex>
            <Flex justifyContent="space-between" alignItems="baseline" flexDirection={['column', 'row']} gap="8px">
              <Flex fontSize="13px" fontWeight="400">
                {order.frequency && order.totalDonations && (
                  <Box mr="16px">
                    <FormattedMessage defaultMessage="Total contributed" />
                    :&nbsp;
                    <FormattedMoneyAmount
                      amount={order.totalDonations.valueInCents}
                      currency={order.totalDonations.currency}
                    />
                  </Box>
                )}
                {order.paymentMethod && <PaymentMethodTypeWithIcon iconSize={18} type={order.paymentMethod?.type} />}
              </Flex>
              <Flex justifyContent={['space-between', 'flex-end']} alignItems="baseline" width={['100%', 'auto']}>
                {order.frequency && order.processedAt && (
                  <P fontSize="13px" fontWeight="400" display={['block', 'none']}>
                    <FormattedMessage defaultMessage="Last charge" />
                    :&nbsp;
                    <DateTime value={order.processedAt} dateStyle="medium" timeStyle={undefined} />
                  </P>
                )}
                {tab === ContributionsTab.RECURRING && !isIncoming && (
                  <Flex justifyContent="center">
                    <PopupMenu
                      placement="bottom-start"
                      Button={({ onClick }) => (
                        <StyledButton data-cy="actions" onClick={onClick} buttonSize="tiny">
                          <FormattedMessage id="Edit" defaultMessage="Edit" />
                        </StyledButton>
                      )}
                    >
                      {() => (
                        <Flex flexDirection="column">
                          <ActionButton onClick={() => setEditOrder({ order, action: 'editPaymentMethod' })}>
                            <FormattedMessage
                              id="subscription.menu.editPaymentMethod"
                              defaultMessage="Update payment method"
                            />
                          </ActionButton>
                          <ActionButton onClick={() => setEditOrder({ order, action: 'editAmount' })}>
                            <FormattedMessage id="subscription.menu.updateAmount" defaultMessage="Update amount" />
                          </ActionButton>
                          <ActionButton
                            onClick={() => setEditOrder({ order, action: 'cancel' })}
                            color={themeGet('colors.red.600')}
                          >
                            <FormattedMessage
                              id="subscription.menu.cancelContribution"
                              defaultMessage="Cancel contribution"
                            />
                          </ActionButton>
                        </Flex>
                      )}
                    </PopupMenu>
                  </Flex>
                )}
              </Flex>
            </Flex>
          </Flex>
        </Flex>
      );
    },
  },
];

const TableWrapper = styled.div`
  > div {
    border-radius: 16px;
  }

  thead th {
    padding: 16px 0px;
    font-size: 12px;
    font-weight: 700;
    line-height: 18px;
    color: ${props => props.theme.colors.black[700]};
    :first-child {
      padding-left: 20px;
    }
    :last-child {
      padding-right: 20px;
    }
  }

  tbody tr td {
    font-size: 13px;
    padding: 16px 0px;
    color: ${props => props.theme.colors.black[800]};
    :first-child {
      padding-left: 20px;
    }
    :last-child {
      padding-right: 20px;
    }
  }
`;

const PAGE_SIZE = 20;
const QUERY_FILTERS = ['searchTerm', 'offset'];
const QUERY_FORMATERS = {
  offset: toNumber,
};
const pickQueryFilters = query =>
  mapValues(omitBy(pick(query, QUERY_FILTERS), isNil), (value, key) =>
    QUERY_FORMATERS[key] ? QUERY_FORMATERS[key](value) : value,
  );

type ContributionsProps = AdminSectionProps & {
  direction?: 'INCOMING' | 'OUTGOING';
};

const Contributions = ({ account, direction }: ContributionsProps) => {
  const router = useRouter();
  const intl = useIntl();
  const [tab, setTab] = React.useState<ContributionsTab>(ContributionsTab.RECURRING);
  const [counters, setCounters] = React.useState<Record<ContributionsTab, number>>({
    [ContributionsTab.RECURRING]: undefined,
    [ContributionsTab.ONETIME]: undefined,
    [ContributionsTab.CANCELED]: undefined,
  });
  const queryValues = pickQueryFilters(router.query);
  const { data, loading, error } = useQuery(manageContributionsQuery, {
    variables: {
      slug: account.slug,
      filter: direction || 'OUTGOING',
      limit: PAGE_SIZE,
      ...DEFAULT_VARIABLES[tab],
      ...queryValues,
    },
    context: API_V2_CONTEXT,
    onCompleted: data => {
      setCounters({ ...counters, [tab]: data.account.orders.totalCount });
    },
  });
  const [view, setView] = React.useState<'table' | 'card'>('table');
  const [editOrder, setEditOrder] = React.useState<{ order?: { id: string }; action: EditOrderActions }>({
    order: null,
    action: null,
  });
  useWindowResize(() => setView(window.innerWidth > BREAKPOINTS.LARGE ? 'table' : 'card'));

  const tabs = [
    { id: ContributionsTab.RECURRING, label: 'Recurring', count: counters[ContributionsTab.RECURRING] },
    { id: ContributionsTab.ONETIME, label: 'One-Time', count: counters[ContributionsTab.ONETIME] },
    { id: ContributionsTab.CANCELED, label: 'Canceled', count: counters[ContributionsTab.CANCELED] },
  ];

  const pages = Math.ceil((counters[tab] || 1) / PAGE_SIZE);
  const currentPage = toNumber((queryValues.offset || 0) + PAGE_SIZE) / PAGE_SIZE;
  const isIncoming = direction === 'INCOMING';
  const selectedOrders = data?.account?.orders.nodes || [];

  const updateFilters = props =>
    router.replace({ pathname: router.asPath.split('?')[0], query: pickQueryFilters({ ...router.query, ...props }) });
  const handleTabUpdate = tab => {
    setTab(tab);
    updateFilters({ offset: null });
  };
  const columns =
    view === 'table'
      ? getColumns({ tab, setEditOrder, intl, isIncoming })
      : cardColumns({ tab, setEditOrder, isIncoming });

  return (
    <Container>
      <Flex justifyContent="space-between" alignItems="baseline">
        <H1 fontSize="24px" lineHeight="32px" fontWeight="700">
          {isIncoming ? (
            <FormattedMessage id="Contributors" defaultMessage="Contributors" />
          ) : (
            <FormattedMessage id="Contributions" defaultMessage="Contributions" />
          )}
        </H1>
        <SearchBar
          placeholder={intl.formatMessage({ defaultMessage: 'Search...', id: 'search.placeholder' })}
          defaultValue={router.query.searchTerm}
          height="40px"
          onSubmit={searchTerm => updateFilters({ searchTerm, offset: null })}
        />
      </Flex>
      <Box my="24px">
        <StyledTabs tabs={tabs} selectedId={tab} onChange={handleTabUpdate} />
      </Box>
      <div className="flex flex-col gap-4">
        {error && <MessageBoxGraphqlError error={error} />}
        {loading && <LoadingPlaceholder height="250px" width="100%" borderRadius="16px" />}
        {!error && !loading && (
          <TableWrapper>
            <DataTable
              columns={columns}
              data={selectedOrders}
              highlightRowOnHover={false}
              hideHeader={view === 'card'}
              emptyMessage={() => <FormattedMessage id="NoContributions" defaultMessage="No contributions" />}
            />
          </TableWrapper>
        )}
        <Pagination
          totalPages={pages}
          page={currentPage}
          onChange={page => updateFilters({ offset: (page - 1) * PAGE_SIZE })}
        />
      </div>
      {editOrder.order && (
        <EditOrderModal
          account={account}
          order={editOrder.order}
          action={editOrder.action}
          onClose={() => setEditOrder({ order: null, action: null })}
        />
      )}
    </Container>
  );
};

export default Contributions;
