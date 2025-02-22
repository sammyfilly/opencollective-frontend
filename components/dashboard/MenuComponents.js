import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { ChevronDown } from '@styled-icons/feather/ChevronDown';
import { ChevronUp } from '@styled-icons/feather/ChevronUp';
import { useRouter } from 'next/router';
import ReactAnimateHeight from 'react-animate-height';
import { useIntl } from 'react-intl';
import styled, { css } from 'styled-components';

import { getWorkspaceRoute } from '../../lib/url-helpers';

import { Flex } from '../Grid';
import Link from '../Link';
import StyledLink from '../StyledLink';
import { Span } from '../Text';

import { SECTION_LABELS } from './constants';
import { DashboardContext } from './DashboardContext';

const MenuLinkContainer = styled.div`
  a,
  ${StyledLink} {
    display: flex;
    align-items: center;
    font-weight: 600;
    font-size: 14px;
    line-height: 20px;
    padding: 8px 12px;
    border-radius: 16px;
    -webkit-font-smoothing: antialiased;
    width: 100%;
    cursor: pointer;

    svg {
      flex-shrink: 0;
    }

    ${props =>
      props.isSelected
        ? css`
            background: ${props => props.theme.colors.primary[50]};
            color: ${props => props.theme.colors.primary[700]} !important;
            &:hover {
              color: ${props => props.theme.colors.primary[700]} !important;
            }
          `
        : css`
            color: ${props => props.theme.colors.black[900]} !important;
            &:hover {
              color: ${props => props.theme.colors.primary[700]} !important;
              background: ${props => props.theme.colors.primary[50]};
            }
          `}

    ${props =>
      props.isSub
        ? css`
            padding-left: 32px;
          `
        : css``}
  }
`;

const ExpandButton = styled.button`
  border: 0;
  outline: 0;
  border-radius: 6px;
  flex-shrink: 0;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  transition: background 50ms ease-in-out;
  color: ${props => props.theme.colors.black[800]};
  &:hover {
    background: ${props => props.theme.colors.black[200]};
  }
`;

export const MenuLink = ({
  section,
  children,
  onClick,
  if: conditional,
  isBeta,
  icon = null,
  renderSubMenu,
  parentSection = null,
  goToSection,
}) => {
  const router = useRouter();
  const { selectedSection, expandedSection, setExpandedSection, account } = React.useContext(DashboardContext);
  const expanded = expandedSection === section;
  const { formatMessage } = useIntl();
  const isSelected = section && selectedSection === section;

  useEffect(() => {
    if (parentSection && isSelected) {
      setExpandedSection?.(parentSection);
    }
  }, [isSelected]);

  if (conditional === false) {
    return null;
  }

  if (!children && SECTION_LABELS[section]) {
    children = formatMessage(SECTION_LABELS[section]);
  }
  const handleClick = e => {
    setExpandedSection?.(section);
    onClick?.(e);
    if (goToSection) {
      router.push({ pathname: getWorkspaceRoute(account, goToSection) });
    }
  };

  const renderButtonContent = () => (
    <Flex alignItems="center" justifyContent="space-between" flex={1}>
      <Flex alignItems="center" gridGap="8px">
        {icon}
        <Span truncateOverflow>
          {children}
          {isBeta ? ' (Beta)' : ''}
        </Span>
      </Flex>
      {renderSubMenu && (
        <ExpandButton
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();

            setExpandedSection(expanded ? null : section);
          }}
        >
          {expanded ? <ChevronUp size="16px" /> : <ChevronDown size="16px" />}
        </ExpandButton>
      )}
    </Flex>
  );
  return (
    <React.Fragment>
      <MenuLinkContainer isSelected={isSelected} isSub={!!parentSection}>
        {onClick ? (
          <StyledLink as="button" onClick={handleClick} data-cy={`menu-item-${section}`}>
            {renderButtonContent()}
          </StyledLink>
        ) : (
          <Link
            onClick={handleClick}
            href={getWorkspaceRoute(account, goToSection ? goToSection : section)}
            data-cy={`menu-item-${section}`}
          >
            {renderButtonContent()}
          </Link>
        )}
      </MenuLinkContainer>
      {renderSubMenu && (
        <ReactAnimateHeight duration={150} height={expanded ? 'auto' : 0}>
          {renderSubMenu({ parentSection: section })}
        </ReactAnimateHeight>
      )}
    </React.Fragment>
  );
};

MenuLink.propTypes = {
  if: PropTypes.bool,
  section: PropTypes.string,
  selectedSection: PropTypes.string,
  children: PropTypes.node,
  isBeta: PropTypes.bool,
  isStrong: PropTypes.bool,
  onClick: PropTypes.func,
  afterClick: PropTypes.func,
  icon: PropTypes.node,
  renderSubMenu: PropTypes.func,
  parentSection: PropTypes.string,
  goToSection: PropTypes.string,
};

export const MenuSectionHeader = styled.div`
  font-weight: 500;
  font-size: 12px;
  line-height: 24px;
  margin-bottom: 6px;

  color: ${props => props.theme.colors.black[600]};
`;

export const MenuGroup = ({ if: conditional, children, ...props }) => {
  return conditional === false ? null : (
    <Flex flexDirection="column" gap="8px" {...props}>
      {children}
    </Flex>
  );
};

MenuGroup.propTypes = {
  if: PropTypes.bool,
  children: PropTypes.node,
};
